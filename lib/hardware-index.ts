// lib/hardware-index.ts
// Curated index of common robotics components available in India.

export type HardwareCategory = 'sensors' | 'motors' | 'controllers' | 'power' | 'cameras';

export type HardwareDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type HardwareItem = {
  id: string;
  name: string;
  category: HardwareCategory;
  type: string;
  use: string;
  priceLow: number; // INR
  priceHigh: number; // INR
  links: { label: string; href: string }[];
  difficulty: HardwareDifficulty;
};

export const HARDWARE_CATEGORIES: { id: HardwareCategory; label: string; emoji: string }[] = [
  { id: 'sensors', label: 'Sensors', emoji: '👁️' },
  { id: 'motors', label: 'Motors & Actuators', emoji: '💪' },
  { id: 'controllers', label: 'Controllers', emoji: '🧠' },
  { id: 'power', label: 'Power', emoji: '⚡' },
  { id: 'cameras', label: 'Cameras', emoji: '📷' },
];

// Search URLs use friendly query strings so they continue to work even if a specific item is out of stock.
function robu(q: string) { return `https://robu.in/?s=${encodeURIComponent(q)}`; }
function rocraze(q: string) { return `https://robocraze.com/search?q=${encodeURIComponent(q)}`; }
function amazon(q: string) { return `https://www.amazon.in/s?k=${encodeURIComponent(q)}`; }

export const HARDWARE: HardwareItem[] = [
  // ===== Sensors =====
  { id: 'hc-sr04', name: 'HC-SR04 Ultrasonic Sensor', category: 'sensors', type: 'Distance', use: 'Measure distance via sound waves', priceLow: 60, priceHigh: 120, links: [{ label: 'Robu.in', href: robu('HC-SR04 ultrasonic') }, { label: 'Robocraze', href: rocraze('HC-SR04') }, { label: 'Amazon', href: amazon('HC-SR04 ultrasonic sensor') }], difficulty: 'beginner' },
  { id: 'ir-sensor', name: 'IR Proximity Sensor', category: 'sensors', type: 'Optical', use: 'Line following, obstacle detect', priceLow: 30, priceHigh: 80, links: [{ label: 'Robu.in', href: robu('IR proximity sensor') }, { label: 'Robocraze', href: rocraze('IR sensor') }], difficulty: 'beginner' },
  { id: 'mpu6050', name: 'MPU6050 IMU', category: 'sensors', type: 'IMU (accel + gyro)', use: 'Orientation + motion', priceLow: 120, priceHigh: 250, links: [{ label: 'Robu.in', href: robu('MPU6050') }, { label: 'Robocraze', href: rocraze('MPU6050') }], difficulty: 'intermediate' },
  { id: 'mpu9250', name: 'MPU9250 9-axis IMU', category: 'sensors', type: 'IMU + magnetometer', use: 'Pose for drones, full AHRS', priceLow: 350, priceHigh: 750, links: [{ label: 'Robu.in', href: robu('MPU9250') }, { label: 'Amazon', href: amazon('MPU9250') }], difficulty: 'intermediate' },
  { id: 'vl53l0x', name: 'VL53L0X ToF Distance', category: 'sensors', type: 'Time of Flight', use: 'Precise 30 mm – 2 m distance', priceLow: 250, priceHigh: 450, links: [{ label: 'Robu.in', href: robu('VL53L0X') }, { label: 'Robocraze', href: rocraze('VL53L0X') }], difficulty: 'intermediate' },
  { id: 'lidar-rplidar-a1', name: 'RPLIDAR A1 2D Lidar', category: 'sensors', type: 'Lidar', use: '360° mapping for SLAM', priceLow: 7000, priceHigh: 10000, links: [{ label: 'Robu.in', href: robu('RPLIDAR A1') }], difficulty: 'advanced' },
  { id: 'lidar-rplidar-a2', name: 'RPLIDAR A2M8 2D Lidar', category: 'sensors', type: 'Lidar', use: 'Higher-res SLAM', priceLow: 12000, priceHigh: 18000, links: [{ label: 'Robu.in', href: robu('RPLIDAR A2') }], difficulty: 'advanced' },
  { id: 'gps-neo6m', name: 'NEO-6M GPS Module', category: 'sensors', type: 'GPS', use: 'Outdoor localisation', priceLow: 350, priceHigh: 700, links: [{ label: 'Robu.in', href: robu('NEO-6M GPS') }, { label: 'Robocraze', href: rocraze('GPS NEO 6M') }], difficulty: 'beginner' },
  { id: 'gps-neom8n', name: 'NEO-M8N GPS Module', category: 'sensors', type: 'GPS', use: 'Higher-accuracy GPS', priceLow: 1200, priceHigh: 2200, links: [{ label: 'Robu.in', href: robu('NEO-M8N') }], difficulty: 'intermediate' },
  { id: 'dht11', name: 'DHT11 Temp + Humidity', category: 'sensors', type: 'Environment', use: 'Weather, agri, indoor', priceLow: 80, priceHigh: 200, links: [{ label: 'Robu.in', href: robu('DHT11') }], difficulty: 'beginner' },
  { id: 'dht22', name: 'DHT22 Temp + Humidity (better)', category: 'sensors', type: 'Environment', use: 'Higher-accuracy', priceLow: 200, priceHigh: 400, links: [{ label: 'Robu.in', href: robu('DHT22') }], difficulty: 'beginner' },
  { id: 'mq2-gas', name: 'MQ-2 Gas Sensor', category: 'sensors', type: 'Gas', use: 'Smoke/LPG leak detection', priceLow: 100, priceHigh: 250, links: [{ label: 'Robu.in', href: robu('MQ2 gas sensor') }], difficulty: 'beginner' },
  { id: 'mq135-air', name: 'MQ-135 Air Quality', category: 'sensors', type: 'Air quality', use: 'CO2 / ammonia / NOx', priceLow: 150, priceHigh: 350, links: [{ label: 'Robu.in', href: robu('MQ135') }], difficulty: 'beginner' },
  { id: 'ldr', name: 'LDR (Light Sensor)', category: 'sensors', type: 'Light', use: 'Light tracking, photovore', priceLow: 5, priceHigh: 25, links: [{ label: 'Robu.in', href: robu('LDR') }], difficulty: 'beginner' },
  { id: 'sw-420', name: 'SW-420 Vibration Sensor', category: 'sensors', type: 'Vibration', use: 'Tap/knock detection', priceLow: 50, priceHigh: 150, links: [{ label: 'Robu.in', href: robu('SW420 vibration') }], difficulty: 'beginner' },
  { id: 'hall-a3144', name: 'A3144 Hall Sensor', category: 'sensors', type: 'Magnetic', use: 'RPM counting, position', priceLow: 25, priceHigh: 100, links: [{ label: 'Robu.in', href: robu('A3144 hall') }], difficulty: 'beginner' },
  { id: 'load-cell-5kg', name: '5kg Load Cell + HX711', category: 'sensors', type: 'Force', use: 'Digital weighing scale', priceLow: 350, priceHigh: 700, links: [{ label: 'Robu.in', href: robu('5kg load cell HX711') }], difficulty: 'intermediate' },
  { id: 'force-fsr', name: 'Force Sensitive Resistor', category: 'sensors', type: 'Pressure', use: 'Grip sensing', priceLow: 250, priceHigh: 600, links: [{ label: 'Robu.in', href: robu('FSR force sensor') }], difficulty: 'intermediate' },
  { id: 'flex', name: 'Flex Sensor', category: 'sensors', type: 'Bend', use: 'Gesture gloves', priceLow: 350, priceHigh: 800, links: [{ label: 'Robu.in', href: robu('flex sensor') }], difficulty: 'intermediate' },
  { id: 'tcs3200', name: 'TCS3200 Colour Sensor', category: 'sensors', type: 'Colour', use: 'Sort objects by colour', priceLow: 250, priceHigh: 550, links: [{ label: 'Robu.in', href: robu('TCS3200') }], difficulty: 'beginner' },
  { id: 'pir', name: 'PIR Motion Sensor', category: 'sensors', type: 'Motion', use: 'Detect human movement', priceLow: 80, priceHigh: 200, links: [{ label: 'Robu.in', href: robu('PIR motion sensor') }], difficulty: 'beginner' },
  { id: 'sound-mic', name: 'KY-038 Sound Sensor', category: 'sensors', type: 'Sound', use: 'Clap-on lamps, sound trigger', priceLow: 60, priceHigh: 150, links: [{ label: 'Robu.in', href: robu('KY-038 sound') }], difficulty: 'beginner' },

  // ===== Motors & Actuators =====
  { id: 'tt-motor', name: 'TT DC Motor (Yellow Gear)', category: 'motors', type: 'Geared DC', use: 'Robot chassis wheels', priceLow: 60, priceHigh: 150, links: [{ label: 'Robu.in', href: robu('TT motor yellow') }, { label: 'Robocraze', href: rocraze('TT motor') }], difficulty: 'beginner' },
  { id: 'metal-gear', name: 'N20 Metal Gear Motor', category: 'motors', type: 'Geared DC', use: 'Smaller, higher quality bots', priceLow: 200, priceHigh: 500, links: [{ label: 'Robu.in', href: robu('N20 metal gear motor') }], difficulty: 'intermediate' },
  { id: 'sg90', name: 'SG90 Micro Servo (9g)', category: 'motors', type: 'Servo', use: 'Arms, grippers', priceLow: 90, priceHigh: 250, links: [{ label: 'Robu.in', href: robu('SG90 servo') }], difficulty: 'beginner' },
  { id: 'mg996r', name: 'MG996R Standard Servo', category: 'motors', type: 'Servo (metal gear)', use: 'Higher-torque arms', priceLow: 300, priceHigh: 700, links: [{ label: 'Robu.in', href: robu('MG996R') }], difficulty: 'intermediate' },
  { id: 'nema17', name: 'NEMA 17 Stepper Motor', category: 'motors', type: 'Stepper', use: '3D printers, CNC', priceLow: 350, priceHigh: 1200, links: [{ label: 'Robu.in', href: robu('NEMA 17 stepper') }], difficulty: 'intermediate' },
  { id: 'bldc-2200kv', name: 'A2212 2200KV BLDC', category: 'motors', type: 'BLDC', use: 'Drone propulsion', priceLow: 350, priceHigh: 800, links: [{ label: 'Robu.in', href: robu('A2212 BLDC') }], difficulty: 'advanced' },
  { id: 'vibration-motor', name: 'Coin Vibration Motor', category: 'motors', type: 'Vibrator', use: 'Haptic feedback', priceLow: 30, priceHigh: 100, links: [{ label: 'Robu.in', href: robu('coin vibration motor') }], difficulty: 'beginner' },
  { id: 'solenoid-5v', name: '5V Push Solenoid', category: 'motors', type: 'Solenoid', use: 'Latches, kickers', priceLow: 250, priceHigh: 600, links: [{ label: 'Robu.in', href: robu('5V solenoid') }], difficulty: 'intermediate' },
  { id: 'linear-12v', name: '12V Linear Actuator (50mm)', category: 'motors', type: 'Linear', use: 'Lift / push tasks', priceLow: 1500, priceHigh: 3500, links: [{ label: 'Robu.in', href: robu('linear actuator 12V') }], difficulty: 'intermediate' },
  { id: 'l298n', name: 'L298N Motor Driver', category: 'motors', type: 'Driver (2-ch)', use: 'Drive DC motors from Arduino', priceLow: 110, priceHigh: 250, links: [{ label: 'Robu.in', href: robu('L298N motor driver') }], difficulty: 'beginner' },
  { id: 'tb6612', name: 'TB6612FNG Motor Driver', category: 'motors', type: 'Driver (2-ch, efficient)', use: 'Cooler than L298N', priceLow: 250, priceHigh: 450, links: [{ label: 'Robu.in', href: robu('TB6612FNG') }], difficulty: 'intermediate' },

  // ===== Controllers =====
  { id: 'arduino-uno', name: 'Arduino Uno R3', category: 'controllers', type: 'MCU board', use: 'Beginner microcontroller', priceLow: 400, priceHigh: 900, links: [{ label: 'Robu.in', href: robu('arduino uno') }, { label: 'Amazon', href: amazon('arduino uno') }], difficulty: 'beginner' },
  { id: 'arduino-nano', name: 'Arduino Nano', category: 'controllers', type: 'MCU board', use: 'Compact Arduino', priceLow: 250, priceHigh: 500, links: [{ label: 'Robu.in', href: robu('arduino nano') }], difficulty: 'beginner' },
  { id: 'arduino-mega', name: 'Arduino Mega 2560', category: 'controllers', type: 'MCU board', use: '50+ I/O pins', priceLow: 900, priceHigh: 1800, links: [{ label: 'Robu.in', href: robu('arduino mega') }], difficulty: 'intermediate' },
  { id: 'esp32', name: 'ESP32 Dev Board', category: 'controllers', type: 'Wi-Fi + Bluetooth MCU', use: 'Wireless robots, IoT', priceLow: 350, priceHigh: 700, links: [{ label: 'Robu.in', href: robu('ESP32') }, { label: 'Robocraze', href: rocraze('ESP32') }], difficulty: 'intermediate' },
  { id: 'esp8266', name: 'NodeMCU ESP8266', category: 'controllers', type: 'Wi-Fi MCU', use: 'Cheap Wi-Fi IoT', priceLow: 220, priceHigh: 400, links: [{ label: 'Robu.in', href: robu('ESP8266') }], difficulty: 'beginner' },
  { id: 'stm32-bluepill', name: 'STM32 Blue Pill', category: 'controllers', type: 'ARM Cortex-M3', use: 'Faster than Arduino', priceLow: 250, priceHigh: 500, links: [{ label: 'Robu.in', href: robu('STM32 blue pill') }], difficulty: 'intermediate' },
  { id: 'rpi-4', name: 'Raspberry Pi 4 (4GB)', category: 'controllers', type: 'SBC', use: 'ROS2 brain', priceLow: 5000, priceHigh: 7500, links: [{ label: 'Robu.in', href: robu('raspberry pi 4') }, { label: 'Amazon', href: amazon('raspberry pi 4 4GB') }], difficulty: 'intermediate' },
  { id: 'rpi-5', name: 'Raspberry Pi 5 (8GB)', category: 'controllers', type: 'SBC', use: 'Faster ROS2 brain', priceLow: 9000, priceHigh: 14000, links: [{ label: 'Robu.in', href: robu('raspberry pi 5') }], difficulty: 'intermediate' },
  { id: 'jetson-nano', name: 'NVIDIA Jetson Nano', category: 'controllers', type: 'AI SBC', use: 'Onboard deep learning', priceLow: 11000, priceHigh: 18000, links: [{ label: 'Robu.in', href: robu('jetson nano') }, { label: 'Amazon', href: amazon('jetson nano') }], difficulty: 'advanced' },
  { id: 'jetson-orin', name: 'NVIDIA Jetson Orin Nano', category: 'controllers', type: 'AI SBC (faster)', use: 'Modern humanoid/perception', priceLow: 38000, priceHigh: 55000, links: [{ label: 'Robu.in', href: robu('jetson orin nano') }], difficulty: 'advanced' },
  { id: 'micro-bit', name: 'micro:bit v2', category: 'controllers', type: 'Education MCU', use: 'School robotics', priceLow: 1400, priceHigh: 2200, links: [{ label: 'Robu.in', href: robu('micro:bit v2') }, { label: 'Amazon', href: amazon('micro:bit v2') }], difficulty: 'beginner' },

  // ===== Power =====
  { id: 'lipo-3s', name: 'LiPo 3S 11.1V 2200mAh', category: 'power', type: 'LiPo', use: 'Drones, robots', priceLow: 1200, priceHigh: 2500, links: [{ label: 'Robu.in', href: robu('LiPo 3S 2200mAh') }], difficulty: 'intermediate' },
  { id: 'li-ion-18650', name: '18650 Li-ion (3500mAh)', category: 'power', type: 'Li-ion cell', use: 'Reusable robot packs', priceLow: 250, priceHigh: 600, links: [{ label: 'Robu.in', href: robu('18650 3500mAh') }], difficulty: 'intermediate' },
  { id: 'tp4056', name: 'TP4056 Charging Module', category: 'power', type: 'Charger IC', use: 'Charge 18650 / Li-ion', priceLow: 30, priceHigh: 100, links: [{ label: 'Robu.in', href: robu('TP4056') }], difficulty: 'beginner' },
  { id: 'bms-3s', name: '3S Lithium BMS Board', category: 'power', type: 'BMS', use: 'Protect 3-cell packs', priceLow: 120, priceHigh: 300, links: [{ label: 'Robu.in', href: robu('3S BMS') }], difficulty: 'intermediate' },
  { id: 'buck-lm2596', name: 'LM2596 Buck Converter', category: 'power', type: 'Buck (step-down)', use: '12V→5V for boards', priceLow: 60, priceHigh: 150, links: [{ label: 'Robu.in', href: robu('LM2596') }], difficulty: 'beginner' },
  { id: 'boost-mt3608', name: 'MT3608 Boost Converter', category: 'power', type: 'Boost (step-up)', use: '5V→12V for motors', priceLow: 60, priceHigh: 180, links: [{ label: 'Robu.in', href: robu('MT3608') }], difficulty: 'beginner' },
  { id: 'powerbank-10000', name: '10000mAh Power Bank', category: 'power', type: 'USB power', use: 'Easy Raspberry Pi power', priceLow: 800, priceHigh: 1800, links: [{ label: 'Amazon', href: amazon('10000mAh power bank') }], difficulty: 'beginner' },

  // ===== Cameras =====
  { id: 'esp32-cam', name: 'ESP32-CAM (OV2640)', category: 'cameras', type: 'Wi-Fi camera', use: 'Streaming security bot', priceLow: 500, priceHigh: 900, links: [{ label: 'Robu.in', href: robu('ESP32 CAM') }], difficulty: 'intermediate' },
  { id: 'rpi-cam-v3', name: 'Raspberry Pi Camera Module 3', category: 'cameras', type: 'CSI camera', use: 'High-quality vision on Pi', priceLow: 2500, priceHigh: 4500, links: [{ label: 'Robu.in', href: robu('raspberry pi camera v3') }], difficulty: 'intermediate' },
  { id: 'pixy2', name: 'Pixy2 Smart Camera', category: 'cameras', type: 'Vision module', use: 'Pre-built object detection', priceLow: 8000, priceHigh: 12000, links: [{ label: 'Robu.in', href: robu('Pixy2') }], difficulty: 'advanced' },
  { id: 'realsense-d435i', name: 'Intel RealSense D435i', category: 'cameras', type: 'Depth + IMU', use: 'SLAM, 3D mapping', priceLow: 28000, priceHigh: 38000, links: [{ label: 'Robu.in', href: robu('Intel RealSense D435i') }], difficulty: 'advanced' },
  { id: 'usb-webcam', name: 'USB Webcam (Logitech C270)', category: 'cameras', type: 'USB camera', use: 'Plug-and-play vision', priceLow: 1800, priceHigh: 3500, links: [{ label: 'Amazon', href: amazon('Logitech C270') }], difficulty: 'beginner' },
];

export const HARDWARE_BY_ID = new Map(HARDWARE.map((h) => [h.id, h]));
