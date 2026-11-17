import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { FPS } from "./videos/bridge/story";
import { NightMarketShort, NM_FRAMES } from "./videos/nightmarket/NightMarket";
import { FPS as NM_FPS } from "./videos/nightmarket/story";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BridgeShort"
        component={BridgeShort}
        durationInFrames={BRIDGE_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="NightMarketShort"
        component={NightMarketShort}
        durationInFrames={NM_FRAMES}
        fps={NM_FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
