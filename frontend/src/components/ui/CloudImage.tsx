"use client";

import Image, { ImageProps } from "next/image";
import { CldImage } from "next-cloudinary";

type CloudImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

export function CloudImage({ src, ...props }: CloudImageProps) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const isCloudinary =
    (src.includes("cloudinary.com") || src.startsWith("cld-")) && !!cloudName;

  if (isCloudinary) {
    return (
      <CldImage
        {...props}
        src={src}
        crop={{
          type: "auto",
          source: true,
        }}
      />
    );
  }

  return (
    <Image
      {...props}
      src={src}
      unoptimized={
        src.startsWith("http://127.0.0.1") || src.startsWith("http://localhost")
      }
    />
  );
}
