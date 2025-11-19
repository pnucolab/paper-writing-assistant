/**
 * Backup and Restore utilities for localStorage data
 * Uses Web Crypto API for encryption/decryption with AES-GCM
 */

interface BackupData {
	timestamp: string;
	salt: string;
	iv: string;
	data: string;
}

/**
 * Generate a random salt for key derivation
 */
function generateSalt(): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generate a random initialization vector for AES-GCM
 */
function generateIV(): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Derive a key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const passwordBuffer = encoder.encode(password);

	const baseKey = await crypto.subtle.importKey(
		'raw',
		passwordBuffer,
		'PBKDF2',
		false,
		['deriveBits', 'deriveKey']
	);

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: salt,
			iterations: 100000,
			hash: 'SHA-256'
		},
		baseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

/**
 * Convert Uint8Array to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/**
 * Export all localStorage data as encrypted backup
 */
export async function createBackup(password: string): Promise<string> {
	try {
		// Collect all localStorage data
		const localStorageData: Record<string, string> = {};
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key) {
				localStorageData[key] = localStorage.getItem(key) || '';
			}
		}

		// Generate salt and IV
		const salt = generateSalt();
		const iv = generateIV();

		// Derive encryption key
		const key = await deriveKey(password, salt);

		// Encrypt data
		const encoder = new TextEncoder();
		const dataBuffer = encoder.encode(JSON.stringify(localStorageData));

		const encryptedData = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv: iv
			},
			key,
			dataBuffer
		);

		// Create backup object
		const backup: BackupData = {
			timestamp: new Date().toISOString(),
			salt: arrayBufferToBase64(salt),
			iv: arrayBufferToBase64(iv),
			data: arrayBufferToBase64(encryptedData)
		};

		return JSON.stringify(backup, null, 2);
	} catch (error) {
		console.error('Backup creation failed:', error);
		throw new Error('Failed to create backup');
	}
}

/**
 * Restore localStorage data from encrypted backup
 */
export async function restoreBackup(backupJson: string, password: string): Promise<void> {
	try {
		// Parse backup data
		const backup: BackupData = JSON.parse(backupJson);

		// Convert base64 strings back to Uint8Array
		const salt = base64ToArrayBuffer(backup.salt);
		const iv = base64ToArrayBuffer(backup.iv);
		const encryptedData = base64ToArrayBuffer(backup.data);

		// Derive decryption key
		const key = await deriveKey(password, salt);

		// Decrypt data
		const decryptedData = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: iv
			},
			key,
			encryptedData
		);

		// Parse decrypted data
		const decoder = new TextDecoder();
		const dataString = decoder.decode(decryptedData);
		const localStorageData: Record<string, string> = JSON.parse(dataString);

		// Clear existing localStorage
		localStorage.clear();

		// Restore all data
		Object.entries(localStorageData).forEach(([key, value]) => {
			localStorage.setItem(key, value);
		});
	} catch (error) {
		console.error('Backup restoration failed:', error);
		if (error instanceof Error && error.message.includes('decrypt')) {
			throw new Error('Invalid password or corrupted backup file');
		}
		throw new Error('Failed to restore backup');
	}
}

/**
 * Download backup file
 */
export function downloadBackup(backupData: string): void {
	const blob = new Blob([backupData], { type: 'application/octet-stream' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `paper-writer-backup-${new Date().toISOString().split('T')[0]}.pwa`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Read backup file
 */
export async function readBackupFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') {
				resolve(reader.result);
			} else {
				reject(new Error('Failed to read file'));
			}
		};
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsText(file);
	});
}
