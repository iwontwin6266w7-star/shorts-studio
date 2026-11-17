import React from "react";
import { Composition } from "remotion";
import { WhyGuyShort } from "./videos/whyguy/WhyGuyShort";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WhyGuyShort"
      component={WhyGuyShort}
      durationInFrames={60 * 30}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};