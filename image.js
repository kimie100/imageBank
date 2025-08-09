const sharp = require("sharp");
const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");

class ImageStorage {
  /**
   * Initialize with upload directory
   * @param {string} uploadDir - Base directory for uploads
   */
  constructor(uploadDir = "uploads") {
    this.uploadDir = uploadDir;
  }

  /**
   * Generate unique filename
   * @param {string} format - Image format (jpg, png, webp)
   * @returns {string} Unique filename
   */
  generateUniqueFilename(format) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    return `${timestamp}-${random}.${format}`;
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.chmod(this.uploadDir, 0o777);
    }
  }

  /**
   * Convert base64 to buffer
   * @param {string} base64String - Raw base64 string
   * @returns {Buffer} Image buffer
   */
  base64ToBuffer(base64String) {
    return Buffer.from(base64String, "base64");
  }

  /**
   * Save and optimize image from base64
   * @param {string} base64String - Raw base64 string (without data URL prefix)
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Result with file info and optimization metadata
   */
  async saveImage(
    base64String,
    {
      width = null,
      quality = 100,
      format = "jpeg",
      maintainAspectRatio = true,
      subDirectory = "",
      filename = "", // Optional subdirectory within uploads folder
    } = {}
  ) {
    try {
      // Ensure upload directory exists
      const fullUploadPath = path.join(this.uploadDir, subDirectory);
      await fs.mkdir(fullUploadPath, { recursive: true });
      await fs.chmod(fullUploadPath, 0o777);
      // Get input size for comparison
      const inputSize = base64String.length;

      // Convert base64 to buffer
      const inputBuffer = this.base64ToBuffer(base64String);

      // Initialize sharp with input buffer
      let imageProcessor = sharp(inputBuffer);

      // Get original image metadata
      const metadata = await imageProcessor.metadata();

      // Resize if width is specified
      if (width) {
        const resizeOptions = {
          width,
          withoutEnlargement: true,
        };

        if (maintainAspectRatio) {
          resizeOptions.height = Math.round(
            width * (metadata.height / metadata.width)
          );
          resizeOptions.fit = "inside";
        }

        imageProcessor = imageProcessor.resize(resizeOptions);
      }

      // Format-specific optimizations
      switch (format.toLowerCase()) {
        case "jpeg":
        case "jpg":
          imageProcessor = imageProcessor.jpeg({
            quality,
            mozjpeg: true,
            chromaSubsampling: "4:4:4",
          });
          break;

        case "png":
          imageProcessor = imageProcessor.png({
            quality,
            compressionLevel: 9,
            palette: true,
          });
          break;

        case "webp":
          imageProcessor = imageProcessor.webp({
            quality,
            effort: 6,
            lossless: false,
          });
          break;

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Generate unique filename
      const filenames = `${filename}.${format}`;

      const filePath = path.join(fullUploadPath, filenames);

      // Save optimized image
      await imageProcessor.toFile(filePath);

      // Get optimized file stats
      const stats = await fs.stat(filePath);
      const outputSize = stats.size;

      // Calculate base64 size of optimized image (for comparison)
      const optimizedBase64Size =
        (outputSize * 4) / 3 + Math.ceil(outputSize / 96);
      const savePercentage = (
        ((inputSize - optimizedBase64Size) / inputSize) *
        100
      ).toFixed(2);

      return {
        success: true,
        fileInfo: {
          filename,
          filePath,
          fullPath: path.resolve(filePath),
          relativePath: path.join(subDirectory, filename),
          url: `/uploads/${subDirectory ? subDirectory + "/" : ""}${filenames}`,
          size: outputSize,
        },
        metadata: {
          originalSize: inputSize,
          optimizedSize: optimizedBase64Size,
          savePercentage,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          outputFormat: format,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete image file
   * @param {string} filename - Name of file to delete
   * @param {string} subDirectory - Optional subdirectory
   * @returns {Promise<boolean>} Success status
   */
  async deleteImage(filename, subDirectory = "") {
    try {
      const filePath = path.join(this.uploadDir, subDirectory, filename);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all images in directory
   * @param {string} subDirectory - Optional subdirectory
   * @returns {Promise<Array>} List of image files
   */
  async listImages(subDirectory = "") {
    try {
      const dirPath = path.join(this.uploadDir, subDirectory);
      const files = await fs.readdir(dirPath);
      return files.filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file));
    } catch {
      return [];
    }
  }
}

module.exports = ImageStorage;
