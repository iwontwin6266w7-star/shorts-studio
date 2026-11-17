// Why Guy-Style Listicle Short
// Format: "10 Weird Things About [NAME]..."
// Style: Documentary slideshow with Ken Burns effect
// No 3D, no characters, no ink outlines - pure archival footage

import React, { useMemo } from "react";
import { AbsoluteFill, Audio, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { Img } from "remotion";

interface Fact {
  number: number;
  text: string;
  imageUrl: string;
  duration: number; // seconds
}

// Example: LeBron James facts (replace with your research)
const FACTS: Fact[] = [
  { 
    number: 10, 
    text: "He was named after King James the First from the Bible.", 
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/LeBron_James_-_51559723160_%28cropped%29.jpg/800px-LeBron_James_-_51559723160_%28cropped%29.jpg",
    duration: 5 
  },
  { 
    number: 9, 
    text: "His mother was only 16 when he was born.", 
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/LeBron_James_Warriors_Cavaliers_%281%29.jpg/640px-LeBron_James_Warriors_Cavaliers_%281%29.jpg",
    duration: 5 
  },
  { 
    number: 8, 
    text: "He missed the entire 2018-19 season with a groin injury.", 
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/LeBron_James_Layup_%28cropped%29.jpg/640px-LeBron_James_Layup_%28cropped%29.jpg",
    duration: 5 
  },
  { 
    number: 7, 
    text: "He's the first player to win championships with three different teams.", 
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/LeBron_James_%282018%29.jpg/640px-LeBron_James_%282018%29.jpg",
    duration: 6 
  },
  { 
    number: 6, 
    text: "He has scored over 40,000 career points.", 
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/LeBron_James_2019.jpg/640px-LeBron_James_2019.jpg",
    duration: 5 
  },
  { 
    number: 5, 
    text: "He owns a media company called SpringHill Entertainment.", 
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/LeBron_James_2018.jpg/640px-LeBron_James_2018.jpg",
    duration: 6 
  },
  { 
    number: 4, 
    text: "He donated $2.5 million to build a school in Akron.", 
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/LeBron_James_dunk_2016.jpg/640px-LeBron_James_dunk_2016.jpg",
    duration: 5 
  },
  { 
    number: 3, 
    text: "He's never missed the playoffs in his entire career.", 
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/LeBron_James_2014.jpg/640px-LeBron_James_2014.jpg",
    duration: 6 
  },
  { 
    number: 2, 
    text: "He made $1 billion in his career, mostly from endorsements.", 
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/LeBron_James_2017.jpg/640px-LeBron_James_2017.jpg",
    duration: 6 
  },
  { 
    number: 1, 
    text: "He's considered by many to be the greatest basketball player of all time.", 
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/LeBron_James_2016.jpg/640px-LeBron_James_2016.jpg",
    duration: 7 
  },
];

const FactSlide: React.FC<{ fact: Fact; startFrame: number; durationFrames: number }> = ({ 
  fact, startFrame, durationFrames 
}) => {
  const frame = useCurrentFrame();
  
  // Calculate progress within this slide
  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateRight: "clamp" }
  );
  
  // Ken Burns effect: slow zoom in + subtle pan
  const scale = interpolate(progress, [0, 1], [1.0, 1.25]);
  const translateY = interpolate(progress, [0, 1], [0, -40]);
  const translateX = Math.sin(progress * Math.PI) * 30; // Gentle S-curve pan
  
  // Don't render if outside this slide's time range
  if (frame < startFrame || frame >= startFrame + durationFrames) {
    return null;
  }
  
  return (
    <AbsoluteFill>
      {/* Background image with Ken Burns */}
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundImage: `url(${fact.imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          filter: "brightness(0.7)",
        }}
      />
      
      {/* Fact number overlay */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 60,
          fontSize: 160,
          fontWeight: "900",
          color: "white",
          textShadow: "6px 6px 12px rgba(0,0,0,0.9)",
          fontFamily: "Arial Black, sans-serif",
          opacity: interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
        }}
      >
        #{fact.number}
      </div>
      
      {/* Optional: Fact text at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 40,
          right: 40,
          fontSize: 32,
          fontWeight: "bold",
          color: "white",
          textShadow: "3px 3px 6px rgba(0,0,0,0.9)",
          fontFamily: "Arial, sans-serif",
          textAlign: "left",
          lineHeight: 1.3,
        }}
      >
        {fact.text}
      </div>
    </AbsoluteFill>
  );
};

const TransitionOverlay: React.FC<{ frame: number; startFrame: number; duration: number }> = ({
  frame, startFrame, duration
}) => {
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    { extrapolateRight: "clamp" }
  );
  
  // Simple crossfade
  const opacity = 1 - Math.abs(progress - 0.5) * 2;
  
  if (frame < startFrame || frame >= startFrame + duration) return null;
  
  return (
    <AbsoluteFill
      style={{
        background: "black",
        opacity,
      }}
    />
  );
};

export const WhyGuyShort: React.FC = () => {
  const { fps } = useVideoConfig();
  
  // Calculate total duration
  const totalDuration = FACTS.reduce((sum, fact) => sum + fact.duration, 0);
  const totalFrames = totalDuration * fps;
  
  // Pre-calculate frame ranges for each fact
  const factRanges = useMemo(() => {
    const ranges: { fact: Fact; startFrame: number; durationFrames: number }[] = [];
    let currentFrame = 0;
    
    for (const fact of FACTS) {
      const durationFrames = fact.duration * fps;
      ranges.push({
        fact,
        startFrame: currentFrame,
        durationFrames,
      });
      currentFrame += durationFrames;
    }
    
    return ranges;
  }, [fps]);
  
  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      {/* Voice narration */}
      <Audio src="../../voice/voice.wav" volume={1} />
      
      {/* Render each fact slide */}
      {factRanges.map(({ fact, startFrame, durationFrames }) => (
        <FactSlide
          key={fact.number}
          fact={fact}
          startFrame={startFrame}
          durationFrames={durationFrames}
        />
      ))}
      
      {/* Optional: Add transitions between facts */}
      {factRanges.slice(0, -1).map(({ startFrame, durationFrames }, index) => {
        const transitionFrame = startFrame + durationFrames;
        return (
          <TransitionOverlay
            key={`trans-${index}`}
            frame={useCurrentFrame()}
            startFrame={transitionFrame}
            duration={2} // 2-frame crossfade
          />
        );
      })}
      
      {/* End screen */}
      <EndScreen totalFrames={totalFrames} />
    </AbsoluteFill>
  );
};

const EndScreen: React.FC<{ totalFrames: number }> = ({ totalFrames }) => {
  const frame = useCurrentFrame();
  
  // Show in last 3 seconds
  const showStart = totalFrames - 90;
  
  if (frame < showStart) return null;
  
  const progress = interpolate(
    frame,
    [showStart, showStart + 30],
    [0, 1],
    { extrapolateRight: "clamp" }
  );
  
  return (
    <AbsoluteFill
      style={{
        background: "black",
        opacity: progress,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontSize: 48,
          fontWeight: "bold",
          color: "white",
          textAlign: "center",
        }}
      >
        Follow for more!
      </div>
    </AbsoluteFill>
  );
};
