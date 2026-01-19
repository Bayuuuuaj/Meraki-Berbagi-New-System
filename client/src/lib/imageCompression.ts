/**
 * Image Compression Utility
 * Optimizes images for AI processing by ensuring they're under 1MB
 * Uses Canvas API for client-side compression
 */

interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.7,
    maxSizeMB: 1,
};

/**
 * Compresses an image file to meet size and dimension requirements
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed image as a Blob
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<Blob> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Validate file type
    if (!file.type.match(/image\/(jpeg|jpg|png)/i)) {
        throw new Error('Format file tidak didukung. Gunakan JPG, JPEG, atau PNG.');
    }

    // Load image
    const img = await loadImage(file);

    // Calculate new dimensions while maintaining aspect ratio
    const { width, height } = calculateDimensions(
        img.width,
        img.height,
        opts.maxWidth,
        opts.maxHeight
    );

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Gagal membuat canvas context');
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Compress to target size
    let quality = opts.quality;
    let blob = await canvasToBlob(canvas, quality);

    // If still too large, reduce quality iteratively
    const maxBytes = opts.maxSizeMB * 1024 * 1024;
    let iterations = 0;
    const maxIterations = 5;

    while (blob.size > maxBytes && quality > 0.1 && iterations < maxIterations) {
        quality -= 0.1;
        blob = await canvasToBlob(canvas, quality);
        iterations++;
    }

    // Final check
    if (blob.size > maxBytes) {
        throw new Error(`Gagal mengompres gambar ke ukuran ${opts.maxSizeMB}MB. Coba gunakan foto dengan resolusi lebih rendah.`);
    }

    return blob;
}

/**
 * Load image from file
 */
function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Gagal memuat gambar'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // Scale down if needed
    if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
    }

    if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Convert canvas to blob with specified quality
 */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Gagal mengonversi canvas ke blob'));
                }
            },
            'image/jpeg',
            quality
        );
    });
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Convert Blob to Base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
