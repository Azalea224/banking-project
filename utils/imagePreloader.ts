import { Image } from "react-native";
import * as ImageAssets from "../constants/imageAssets";

// Preload all static image assets at app startup
// This improves perceived performance by loading images into memory early
const preloadImages = async () => {
  // Get all image constants from imageAssets
  const imageModules = Object.values(ImageAssets);

  try {
    // Resolve all asset sources to ensure they're loaded into memory
    // This preloads the images so they're ready when components render
    imageModules.forEach((imageModule) => {
      try {
        Image.resolveAssetSource(imageModule);
      } catch (err) {
        // Silently continue if one fails
      }
    });
  } catch (error) {
    // Silently fail - images will load on demand if preloading fails
    console.warn("Image preloading warning:", error);
  }
};

export default preloadImages;
