
/**
 * Resize and compress an image file to a smaller Base64 string.
 * @param file The file object from input
 * @param maxWidth Max width of the output image (default 800px)
 * @param quality Quality from 0 to 1 (default 0.7)
 */
export const compressImage = (file: File, maxWidth = 600, quality = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const elem = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                elem.width = width;
                elem.height = height;
                const ctx = elem.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                // Compress to JPEG/WEBP
                const data = elem.toDataURL('image/jpeg', quality);
                resolve(data);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
