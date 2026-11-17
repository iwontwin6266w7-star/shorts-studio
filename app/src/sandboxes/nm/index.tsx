// sandbox entry: renders the nightmarket BridgeShort for world-agent smoke-test stills
// usage: BRIDGE_ENTRY=src/sandboxes/nm/index.tsx node scripts/bridge-stills.mjs /tmp/opencode/nm- <frames>
import { registerRoot, Composition } from "remotion";
import { NightMarketShort, NM_FRAMES } from "../../videos/nightmarket/NightMarket";

const NmRoot: React.FC = () => (
  <Composition id="BridgeShort" component={NightMarketShort} durationInFrames={NM_FRAMES} fps={30} width={1080} height={1920} />
);

registerRoot(NmRoot);
