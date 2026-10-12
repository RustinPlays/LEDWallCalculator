// Copied from the AV Planner equipment catalogue so this tool is self-contained.
// Source snapshot: RustinPlays/AV-Planner equipment-catalog.js (2026-10-12)
window.AV_DETAILED_CATALOG = [
  { category: 'Audio / Sound Desks', style: 'audio', role: 'mixer', icon: 'MX', items: [
    'Soundcraft Si Expression', 'Soundcraft Si Impact', 'Soundcraft Vi3000', 'Allen & Heath SQ5', 'Allen & Heath SQ6',
    'Allen & Heath QU', 'Midas M32', 'Midas M32R', 'Yamaha Digital Desk', 'Small Analog Mixer', 'Generic Digital Mixer'
  ]},
  { category: 'Audio / Speakers', style: 'audio', role: 'speaker', icon: 'SP', items: [
    'Small Powered Speaker', '8" Speaker', '10" Speaker', '12" Speaker', '15" Speaker', 'Stage Monitor / Wedge',
    'Subwoofer', 'Dual 18" Subwoofer', 'Line Array Top', 'Line Array System', 'Front Fill', 'Amplifier Rack'
  ]},
  { category: 'Audio / I/O', style: 'audio', role: 'audioIO', icon: 'IO', items: [
    'Digital Stagebox', 'Analog Stagebox', 'Audio Splitter', 'DI Box', 'Stereo DI', 'Audio Interface',
    'System Processor / DSP', 'Radio Mic Rack', 'IEM Rack'
  ]},
  { category: 'Audio / Microphones', style: 'audio', role: 'microphone', icon: 'MIC', items: [
    'Vocal Mic', 'Instrument Mic', 'Drum Mic', 'Kick Mic', 'Shotgun Mic', 'Gooseneck / Lectern Mic',
    'Measurement Mic', 'Wireless Handheld', 'Wireless Lapel', 'Wireless Headset', 'Wireless Beltpack', 'RF Antenna'
  ]},
  { category: 'Lighting / Desks', style: 'lighting', role: 'lightingDesk', icon: 'LX', items: [
    'Hog', 'Hedge Hog', 'grandMA', 'grandMA3', 'MA Command Wing', 'Onyx', 'Martin M2PC',
    'Theatrelight Scenemaster', 'Theatrelight Nova', 'Theatrelight Starlet', 'Generic Lighting Desk', 'PC Lighting Control'
  ]},
  { category: 'Lighting / Fixtures', style: 'lighting', role: 'fixture', icon: 'FX', items: [
    'Moving Profile', 'Moving Wash', 'Moving Beam', 'Moving Hybrid', 'LED PAR', 'Conventional PAR', 'LED Fresnel',
    'Conventional Fresnel', 'Profile', 'LED Batten', 'Pixel Bar', 'Pixel Tube', 'LED Tube', 'LED Flood',
    'Blinder', 'Strobe', 'UV Light', 'Pin Spot', 'Festoon', 'Disco Effect'
  ]},
  { category: 'Lighting / Atmospherics', style: 'lighting', role: 'atmospheric', icon: 'HZ', items: [
    'Hazer', 'Smoke Machine', 'Fog Machine', 'Fan'
  ]},
  { category: 'Lighting / Control & Data', style: 'lighting', role: 'dmx', icon: 'DMX', items: [
    'DMX Node', 'DMX Splitter', 'Wireless DMX TX', 'Wireless DMX RX', 'Lighting Data Rack', 'Dimmer Rack', 'Portable Dimmer'
  ]},
  { category: 'Projectors', style: 'displays', role: 'projector', icon: 'PJ', items: [
    'Small Projector', '5K Projector', '7K Projector', '12K Projector', '17K Projector', '30K Projector'
  ]},
  { category: 'LED Wall', style: 'displays', role: 'display', icon: 'LED', items: [
    '500 x 500 LED Panel', '500 x 1000 LED Panel', 'LED Corner Panel', 'Outdoor LED Panel', 'LED Wall',
    'LED Processor', 'NovaStar Processor', 'LED Cube', 'LED Tunnel'
  ]},
  { category: 'TV & Displays', style: 'displays', role: 'display', icon: 'TV', items: [
    '24" Monitor', '32" Display', '40" Display', '50" Display', '55" Display', '60" Display', '65" Display',
    '75" Display', 'Touchscreen', 'Confidence Monitor', 'Data Foldback', 'Multiview Monitor'
  ]},
  { category: 'Video / Cameras', style: 'video', role: 'camera', icon: 'CAM', items: [
    'Blackmagic URSA', 'Blackmagic Studio Camera', 'Sony Broadcast Camera', 'Generic Broadcast Camera',
    'GoPro / Action Camera', 'PTZ Camera'
  ]},
  { category: 'Video / Vision', style: 'video', role: 'videoMixer', icon: 'VM', items: [
    'ATEM Mini', 'ATEM Mini Extreme', 'ATEM 2 M/E', 'ATEM Constellation', 'Barco E2',
    'Panasonic Vision Mixer', 'Analog Way Switcher', 'Video Matrix', 'CCU / Camera Control'
  ]},
  { category: 'Video / Signal', style: 'video', role: 'videoSignal', icon: 'SDI', items: [
    'HDMI to SDI', 'SDI to HDMI', 'Bidirectional Converter', 'Decimator-style HDMI / SDI Cross Converter', 'Decimator MD-HX', 'Cross Converter', 'SDI Distribution', 'HDMI Distribution',
    'Fibre TX', 'Fibre RX', 'Wireless Video TX', 'Wireless Video RX', 'Video Recorder', 'Streaming Encoder'
  ]},
  { category: 'Networking & Control', style: 'infrastructure', role: 'network', icon: 'NET', items: [
    'Show Laptop', 'Media Server', 'Disguise Server', 'Resolume / Arena Server', 'Network Switch',
    'Managed Network Switch', '10G Switch', 'Router', 'Wi-Fi Access Point', '4G Modem', '5G Modem',
    'Starlink', 'Stream Deck', 'Companion Control Station'
  ]},
  { category: 'Comms', style: 'infrastructure', role: 'comms', icon: 'COM', items: [
    'Clear-Com Wired Base', 'Clear-Com Wired Beltpack', 'Clear-Com Wireless Base', 'Clear-Com Wireless Beltpack',
    'Riedel Bolero Antenna', 'Riedel Bolero Beltpack', 'Radio', 'Shout Speaker / Shout System'
  ]},
  { category: 'Power', style: 'infrastructure', role: 'powerDevice', icon: 'PWR', items: [
    '10A Distro', '16A Distro', '32A 3-Phase Distro', '63A 3-Phase Distro', 'Projector Distro',
    'Audio Distro', 'Lighting Distro', 'LED Distro', '20 kVA Generator', '40 kVA Generator',
    '60 kVA Generator', '70 kVA Generator', 'UPS', 'Battery Power Station'
  ]}
];

// LED-specific planning profiles. These are editable planning defaults, not a substitute for the
// exact manufacturer datasheet for a particular cabinet. Add your exact Absen models here later.
window.JC_LED_PROFILES = {
  panels: [
    { id:'g-500x500-p2', name:'Generic 500 x 500 P2', widthMm:500, heightMm:500, pitchMm:2, maxPowerW:200, avgPowerW:90, weightKg:8, maxPowerLink:8 },
    { id:'g-500x500-p3', name:'Generic 500 x 500 P3', widthMm:500, heightMm:500, pitchMm:3, maxPowerW:180, avgPowerW:80, weightKg:8, maxPowerLink:8 },
    { id:'g-500x500-p5', name:'Generic 500 x 500 P5', widthMm:500, heightMm:500, pitchMm:5, maxPowerW:160, avgPowerW:70, weightKg:8, maxPowerLink:10 },
    { id:'g-500x1000-p2', name:'Generic 500 x 1000 P2', widthMm:500, heightMm:1000, pitchMm:2, maxPowerW:400, avgPowerW:180, weightKg:15, maxPowerLink:4 },
    { id:'g-500x1000-p3', name:'Generic 500 x 1000 P3', widthMm:500, heightMm:1000, pitchMm:3, maxPowerW:360, avgPowerW:160, weightKg:15, maxPowerLink:4 },
    { id:'g-500x1000-p5', name:'Generic 500 x 1000 P5', widthMm:500, heightMm:1000, pitchMm:5, maxPowerW:320, avgPowerW:140, weightKg:15, maxPowerLink:5 }
  ],
  processors: [
    { id:'generic-led-processor', name:'LED Processor', outputs:4, pixelsPerOutput:650000, maxPixels:2600000, maxWidth:3840, maxHeight:3840, source:'AV Planner' },
    { id:'novastar-generic', name:'NovaStar Processor', outputs:4, pixelsPerOutput:650000, maxPixels:2600000, maxWidth:3840, maxHeight:3840, source:'AV Planner' }
  ]
};
