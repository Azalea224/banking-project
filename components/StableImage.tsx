import React from "react";
import { Image, ImageProps } from "react-native";

// Memoized Image component to prevent unnecessary re-renders and flickering
// This ensures images don't reload when parent components re-render
const StableImage = React.memo<ImageProps>(
  (props) => {
    return <Image {...props} />;
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if source or key style props change
    // This prevents flickering by avoiding re-renders on parent state changes
    return (
      prevProps.source === nextProps.source &&
      prevProps.style === nextProps.style &&
      prevProps.resizeMode === nextProps.resizeMode
    );
  }
);

StableImage.displayName = "StableImage";

export default StableImage;

