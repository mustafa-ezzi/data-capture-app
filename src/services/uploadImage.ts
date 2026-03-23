export const uploadImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check file size — Firestore doc limit is 1MB
    if (file.size > 800 * 1024) {
      reject(new Error("Image must be smaller than 800KB"));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
};