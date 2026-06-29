// Batch 2: mechanical-design, ai-machine-learning, computer-vision, navigation
import type { TermV2 } from './v2-types';

export const TERMS_BATCH_2: TermV2[] = [
  // ===== Mechanical Design =====
  {
    slug: 'workspace',
    title: 'Workspace of a Robot — Complete Guide | R2BOT',
    description:
      "A robot's workspace is the full set of positions its end-effector can reach. Defines what tasks the robot can physically perform.",
    bucket: 'mechanical-design',
    category: 'fundamentals',
    difficulty: 'intermediate',
    tags: ['workspace', 'reach', 'kinematics', 'arm', 'manipulator'],
    relatedTerms: ['robot-arm', 'forward-kinematics', 'inverse-kinematics', 'singularity', 'degrees-of-freedom'],
    youtubeSearchQuery: 'robot workspace reachable space tutorial',
    definition:
      "The workspace of a robot is the volume of 3D space its end-effector (the tool at the tip) can reach. It is determined by the lengths of the links and the limits of each joint. Engineers split the workspace into the reachable workspace (can touch) and the dexterous workspace (can touch from any orientation).",
    howItWorks:
      "Each link extends the maximum reach; each joint bends the reach into curves. By sweeping all joint angles through their limits, you trace a 3D shell — typically a partial sphere, donut, or complex solid. Numerical tools (MoveIt2, the Robotics Toolbox, custom Python scripts) plot the workspace by sampling joint space and computing forward kinematics. The dexterous workspace is smaller and is where the robot can also achieve any required tool orientation.",
    realWorld:
      "A KUKA KR16 industrial arm has a workspace of ~1.6 m reach — perfect for car-door welding. The da Vinci surgical robot's workspace is just a few cm³ inside the patient's body, but every cm is dexterous. ISRO's ROBOT-3 manipulator has a workspace designed for the geometry of the future Bharatiya Antariksh Station modules.",
    whyItMatters:
      "Choosing or designing a robot starts with workspace analysis: can the arm physically reach every required point? Mis-specified workspaces cause real production failures. Every robot mechanical-engineer interview includes workspace and reachability questions.",
    tryItYourself:
      'Open `/visualizer` and load the IK demo for a 2-link arm. Drag the goal point and watch the workspace boundary glow red as you exit it. Then change one link length and see how the workspace reshapes.',
    quiz: [
      {
        q: "A robot's workspace is:",
        options: ['Its memory in MB', 'The set of points its end-effector can reach', 'Its programming language', 'Its colour'],
        answer: 1,
        explain: 'Workspace is a geometric concept — the volume in 3D space the tool can physically reach.',
      },
      {
        q: 'The dexterous workspace is:',
        options: ['Larger than the reachable workspace', 'A subset where the tool can reach with any orientation', 'Always the same as reachable', 'Imaginary'],
        answer: 1,
        explain: 'Dexterous ⊆ reachable. The dexterous region also allows any required tool orientation, not just position.',
      },
      {
        q: 'Increasing link lengths usually:',
        options: ['Shrinks the workspace', 'Expands the reach but may add inertia and singularities', 'Has no effect', 'Cools the robot'],
        answer: 1,
        explain: 'Longer links reach farther but cost in inertia and can introduce new singular configurations.',
      },
    ],
  },
  {
    slug: 'singularity',
    title: 'Robot Singularity — Complete Guide | R2BOT',
    description:
      "A singularity is a robot pose where the arm loses a degree of freedom — joints can't produce certain end-effector motions. Causes crashes if ignored.",
    bucket: 'mechanical-design',
    category: 'fundamentals',
    difficulty: 'advanced',
    tags: ['singularity', 'kinematics', 'jacobian', 'arm', 'workspace'],
    relatedTerms: ['inverse-kinematics', 'workspace', 'robot-arm', 'redundancy', 'forward-kinematics'],
    youtubeSearchQuery: 'robot singularity explained',
    definition:
      "A singularity is a configuration where a robot's arm loses one or more degrees of freedom — a direction in which the end-effector cannot be moved no matter how the joints rotate. Near singularities, small end-effector motions demand huge joint speeds, often causing dangerous behaviour.",
    howItWorks:
      "The robot Jacobian matrix maps joint velocities to end-effector velocities. At a singular configuration the Jacobian loses rank — its determinant goes to zero. This means certain end-effector velocity directions become unreachable; equivalently, the inverse Jacobian blows up. Examples: a fully extended elbow (boundary singularity), shoulder over the spine (interior singularity), wrist axes aligned (wrist singularity). Motion planners must detect and avoid singularities or use redundancy-resolution to work through them.",
    realWorld:
      "If you've ever seen a robot arm 'lock up' or whip violently in a video, you've watched a singularity event. KUKA, FANUC, and ABB all ship singularity-avoidance algorithms in their controllers. Surgical robots ship with sensors that simply refuse to move into wrist singularities — a hard safety stop.",
    whyItMatters:
      "Misjudging singularities causes broken arms, crashed payloads, and injured humans. Senior robotics engineers must understand the Jacobian, singular values, and how to design around or out of singularities. This is core PhD-level robotics material.",
    tryItYourself:
      "Simulate a 6-DOF arm in MoveIt2. Plan a path that crosses a wrist singularity and watch the joint velocities spike. Then re-plan with singularity avoidance enabled and feel the difference.",
    quiz: [
      {
        q: 'At a robot singularity:',
        options: ['Battery dies', 'The Jacobian loses rank — a DOF is lost in end-effector space', 'Wi-Fi disconnects', 'The robot grows new joints'],
        answer: 1,
        explain: 'The defining condition is rank loss of the geometric Jacobian — the inverse blows up.',
      },
      {
        q: 'Near a singularity, joint velocities required for small end-effector moves tend to:',
        options: ['Stay the same', 'Become very large (and dangerous)', 'Become zero', 'Reverse polarity'],
        answer: 1,
        explain: 'As det(J) → 0, the inverse-Jacobian solution explodes, demanding huge joint speeds.',
      },
      {
        q: 'Which arm pose typically causes a wrist singularity?',
        options: ['All joints at zero', 'Wrist axes aligned (gimbal lock)', 'Random orientation', 'Maximum reach only'],
        answer: 1,
        explain: 'Wrist singularities occur when two or more wrist rotation axes become collinear.',
      },
    ],
  },
  {
    slug: 'denavit-hartenberg',
    title: 'Denavit-Hartenberg Parameters — Complete Guide | R2BOT',
    description:
      'Denavit-Hartenberg (DH) parameters are a compact way to describe robot arm geometry. Standard input to forward kinematics calculations.',
    bucket: 'mechanical-design',
    category: 'fundamentals',
    difficulty: 'advanced',
    tags: ['denavit-hartenberg', 'dh', 'kinematics', 'arm', 'parameters'],
    relatedTerms: ['forward-kinematics', 'inverse-kinematics', 'robot-arm', 'kinematics'],
    youtubeSearchQuery: 'Denavit Hartenberg parameters explained',
    definition:
      "Denavit-Hartenberg (DH) parameters describe the geometry of a robot arm using just four numbers per joint: link length (a), link twist (α), link offset (d), and joint angle (θ). With these four parameters per joint you can compute the position and orientation of the arm's tool in any configuration.",
    howItWorks:
      "DH builds a transformation matrix for each joint that goes from one link frame to the next. The four parameters precisely capture the geometric relationship between consecutive joint axes. Multiplying transforms from base to tool gives the forward-kinematics result. Modern variants (Modified DH by Craig) place the frame origins differently but follow the same idea. Robotics texts and software packages (Robotics Toolbox, MoveIt2 setup) all consume DH tables.",
    realWorld:
      "Every undergraduate robotics course in India (IIT, NIT, BITS) teaches DH parameters in the first semester of the robotics elective. KUKA and Yaskawa publish DH tables for every commercial arm they sell. ISRO uses DH for its space-manipulator designs.",
    whyItMatters:
      "DH is the lingua franca of arm kinematics — universally taught, widely used in legacy code, and the language of every robotics textbook. Even though modern code increasingly uses URDF/Xacro, every senior interview will probe DH understanding.",
    tryItYourself:
      "Take any 6-DOF arm (e.g., the UR5). Look up its DH table from Universal Robots' docs. Implement forward kinematics in Python (15 lines) and verify against MoveIt2's published end-effector pose at the home configuration.",
    quiz: [
      {
        q: 'A DH parameter set has how many numbers per joint?',
        options: ['Two', 'Four', 'Six', 'Ten'],
        answer: 1,
        explain: 'Classic DH uses 4: link length a, twist α, offset d, joint angle θ.',
      },
      {
        q: 'DH parameters are used to compute:',
        options: ['Battery level', 'Forward kinematics of an arm', 'Camera exposure', 'Wi-Fi range'],
        answer: 1,
        explain: 'The product of transforms built from DH gives the base-to-tool pose at any configuration.',
      },
      {
        q: 'Modified DH (Craig convention) differs by:',
        options: ['Using 8 parameters', 'Frame-origin placement at the joint axis instead of next link', 'Adding cameras', 'Using radians only'],
        answer: 1,
        explain: 'Craig\'s modified DH attaches each frame at the current joint axis — minor but important difference for some derivations.',
      },
    ],
  },
  {
    slug: 'mecanum-wheel',
    title: 'Mecanum Wheel in Robotics — Complete Guide | R2BOT',
    description:
      'Mecanum wheels allow a robot to translate sideways without turning. Used in warehouse AMRs, mecanum chassis, and FRC robotics teams.',
    bucket: 'mechanical-design',
    category: 'fundamentals',
    difficulty: 'intermediate',
    tags: ['mecanum', 'wheel', 'omnidirectional', 'amr', 'holonomic'],
    relatedTerms: ['holonomic-drive', 'wheels-vs-tracks', 'differential-drive', 'autonomous-mobile-robot'],
    youtubeSearchQuery: 'mecanum wheel robot omnidirectional explained',
    definition:
      "A mecanum wheel is a special wheel with passive rollers angled at 45° around its outer edge. When four mecanum wheels are arranged in a specific pattern on a chassis, they let the robot move in any direction — including sideways — without first rotating the body.",
    howItWorks:
      "Each roller can only push tangentially because of its angle. When all four wheels spin forward, the longitudinal components add and the sideways components cancel — the robot moves forward. If diagonal pairs spin opposite ways, the longitudinal cancels and sideways components add — the robot crabs sideways. By mixing speeds and directions, any planar motion (vx, vy, ω) is achievable. The inverse kinematics that translate desired chassis motion into wheel speeds is a 4×3 matrix.",
    realWorld:
      "Many warehouse AMRs and hospital delivery bots use mecanum wheels to squeeze through tight aisles. FIRST Robotics Competition (FRC) teams favour mecanum for tournament robots. The KUKA youBot used mecanum drives. Domino's pizza-delivery indoor robots in India trials used mecanum-style chassis.",
    whyItMatters:
      "Mecanum drives unlock motion that differential or Ackermann robots cannot do — critical for tight indoor spaces. They are a standard topic in mobile-robotics curricula and a frequent choice for India's warehouse-automation startups.",
    tryItYourself:
      'On YouTube, search "FRC mecanum demonstration" and watch a team robot strafe in place. Then in `/visualizer` open the mecanum kinematics demo and adjust vx, vy, ω sliders to see the four wheel speeds compute live.',
    quiz: [
      {
        q: 'Mecanum wheels have rollers angled at:',
        options: ['0°', '45° around the wheel rim', '90°', '180°'],
        answer: 1,
        explain: 'The classic mecanum design uses 45° rollers; specific arrangement is crucial for omnidirectional motion.',
      },
      {
        q: 'A 4-wheel mecanum robot can:',
        options: ['Only go forward', 'Translate in any direction and rotate independently', 'Only rotate', 'Only climb stairs'],
        answer: 1,
        explain: 'A correctly configured 4-wheel mecanum gives full 2D holonomic motion.',
      },
      {
        q: 'Mecanum drives are best suited to:',
        options: ['Off-road racing', 'Tight indoor warehouse aisles', 'Climbing trees', 'Deep underwater'],
        answer: 1,
        explain: 'Their ability to crab sideways makes them ideal for confined indoor spaces with little turning room.',
      },
    ],
  },
  // ===== AI/ML =====
  {
    slug: 'convolutional-neural-network',
    title: 'Convolutional Neural Network (CNN) in Robotics — Complete Guide | R2BOT',
    description:
      'CNNs are the workhorse neural architecture for robot vision. They power object detection, segmentation, and depth prediction in every modern robot.',
    bucket: 'ai-machine-learning',
    category: 'ai-and-perception',
    difficulty: 'intermediate',
    tags: ['cnn', 'deep-learning', 'vision', 'object-detection', 'neural-network'],
    relatedTerms: ['neural-network', 'computer-vision', 'object-detection', 'semantic-segmentation', 'transformer-architecture'],
    youtubeSearchQuery: 'convolutional neural network robotics tutorial',
    definition:
      "A Convolutional Neural Network (CNN) is a type of neural network designed for processing images. It uses learnable filters that slide across an image, detecting edges, textures, and shapes — and combining these into high-level features like 'person', 'wheel', or 'apple'. CNNs are the foundation of nearly all modern robot vision.",
    howItWorks:
      "A CNN stacks convolutional layers, each containing many learnable filter kernels (e.g., 3×3). Each filter convolves across the input, producing a feature map highlighting where its pattern appears. Pooling layers downsample, building larger receptive fields. Activation functions (ReLU) add nonlinearity. After many stages, fully connected layers turn the feature maps into class scores or bounding boxes. CNNs are trained by gradient descent on labelled data; modern training relies on GPUs and frameworks like PyTorch.",
    realWorld:
      "YOLO (You Only Look Once) is a CNN that powers real-time object detection in drones, autonomous cars, and warehouse robots. NVIDIA Jetson devices run CNNs at 30+ FPS for on-robot perception. Tesla's vision stack used CNN-only architectures for years; Indian agritech startups (Niqo Robotics, Cropin) use CNNs to detect diseased crops.",
    whyItMatters:
      "CNNs were the breakthrough that made robot vision practical. Every robotics-CV role today expects CNN fluency: training, fine-tuning, deploying on edge devices. Indian engineering schools have entire courses dedicated to CNNs.",
    tryItYourself:
      "Open Google Colab. Train a simple CNN on the MNIST handwritten digits dataset using PyTorch in 30 lines. Achieve 98%+ accuracy in 5 minutes. Then port it to a Raspberry Pi to recognise digits from your phone's camera.",
    quiz: [
      {
        q: 'CNNs are primarily designed for:',
        options: ['Text processing only', 'Image and grid-structured data', 'Database queries', 'Audio compression'],
        answer: 1,
        explain: 'CNNs exploit spatial locality with sliding filters — perfect for images and other grid data.',
      },
      {
        q: 'A typical CNN layer applies:',
        options: ['Random transformations', 'Learnable filter kernels that convolve across the input', 'A single weight', 'A look-up table only'],
        answer: 1,
        explain: 'Each conv layer learns a set of small filters that detect local patterns across the input.',
      },
      {
        q: 'YOLO is a famous example of a:',
        options: ['Coffee machine', 'CNN-based object detector', 'Spreadsheet', 'Speech synth'],
        answer: 1,
        explain: 'YOLO uses a CNN backbone to predict bounding boxes and classes in one forward pass.',
      },
    ],
  },
  {
    slug: 'transformer-architecture',
    title: 'Transformer Architecture in Robotics — Complete Guide | R2BOT',
    description:
      "Transformers use self-attention to handle sequences and multimodal inputs. They power foundation models, ChatGPT, and the new wave of robot policies.",
    bucket: 'ai-machine-learning',
    category: 'ai-and-perception',
    difficulty: 'advanced',
    tags: ['transformer', 'attention', 'foundation-model', 'llm', 'sequence'],
    relatedTerms: ['neural-network', 'large-language-model-robotics', 'foundation-model-robotics', 'convolutional-neural-network'],
    youtubeSearchQuery: 'transformer neural network robotics tutorial',
    definition:
      "The Transformer is a neural network architecture built around self-attention — a mechanism that lets the network look at every part of the input and decide what is important. Transformers power ChatGPT, image-language models, and the latest robotic policies like RT-2.",
    howItWorks:
      "Input tokens (words, image patches, or robot observations) get embedded as vectors. The self-attention layer computes how strongly each token relates to every other token, producing weighted combinations. Multi-head attention runs this in parallel across many subspaces. Layers stack with feed-forward networks and residual connections. Transformers scale extraordinarily well — bigger models trained on more data keep improving — which is why they have replaced CNNs and RNNs in most domains.",
    realWorld:
      "RT-1 and RT-2 from Google DeepMind are transformer policies that map images + language to robot actions. Tesla Autopilot's HydraNet uses transformer modules. Physical Intelligence's π₀ humanoid policy is built on a 3B-parameter transformer. Indian researchers at IIT Bombay use transformers for multimodal manipulation experiments.",
    whyItMatters:
      "Transformers are the foundation of the AI revolution sweeping robotics. Foundation models that act as 'robot brains' are all transformer-based. Any cutting-edge robotics-AI role today requires deep understanding of transformer architecture.",
    tryItYourself:
      "Train a tiny transformer (one head, two layers) on a sequence-prediction task in PyTorch. Walk through every step of self-attention — query, key, value — and visualise the attention maps. This 50-line exercise gives the intuition for billion-parameter models.",
    quiz: [
      {
        q: 'The key innovation of the Transformer architecture is:',
        options: ['Convolution', 'Self-attention across all input tokens', 'Recurrence only', 'Pooling layers'],
        answer: 1,
        explain: 'Self-attention lets every token directly attend to every other token, capturing long-range dependencies.',
      },
      {
        q: 'A famous robot policy using transformers is:',
        options: ['ASIMO', 'RT-2 from Google DeepMind', 'Roomba 600', 'Pepper'],
        answer: 1,
        explain: 'RT-2 maps language + vision to robot actions using a transformer pretrained on the web.',
      },
      {
        q: 'Why have transformers replaced CNNs in many tasks?',
        options: ['They are smaller', 'They scale better with data and compute', 'They are slower', 'They require no training'],
        answer: 1,
        explain: 'Transformers have exhibited remarkable scaling laws — keep adding data and parameters and they keep improving.',
      },
    ],
  },
  {
    slug: 'sim-to-real-transfer',
    title: 'Sim-to-Real Transfer in Robotics — Complete Guide | R2BOT',
    description:
      "Sim-to-Real bridges robot policies trained in simulation to the real world. Solves the data-cost problem of reinforcement learning.",
    bucket: 'ai-machine-learning',
    category: 'ai-and-perception',
    difficulty: 'advanced',
    tags: ['sim-to-real', 'rl', 'simulation', 'transfer', 'domain-randomisation'],
    relatedTerms: ['reinforcement-learning', 'sim-to-real', 'domain-randomisation', 'gazebo-simulation', 'foundation-model-robotics'],
    youtubeSearchQuery: 'sim to real transfer robotics tutorial',
    definition:
      "Sim-to-real transfer is the process of training a robot policy in simulation, where data is abundant and cheap, and then deploying it on a real robot without catastrophic failure. It is the central technique behind modern reinforcement-learning robotics.",
    howItWorks:
      "First, an accurate enough simulator is set up (Gazebo, Isaac Sim, MuJoCo). The policy — typically a neural network — trains in sim for millions of episodes. To bridge the inevitable gap between sim and reality, engineers use domain randomisation (vary lighting, friction, masses, sensor noise during training), domain adaptation (fine-tune on a small set of real data), or system identification (match sim parameters to the real robot precisely). The result is a policy robust to the variation it will encounter in the real world.",
    realWorld:
      "ETH Zürich's ANYmal quadruped learned to walk in simulation and zero-shot transferred to rough terrain — a sim-to-real landmark. OpenAI's robot hand solved Rubik's Cube using sim-to-real with massive domain randomisation. Boston Dynamics increasingly trains controllers in sim before deploying to Spot.",
    whyItMatters:
      "Real-world robot data is expensive (one Spot hour costs thousands of rupees in operator time). Sim-to-real turns simulation into a cheap source of training data — a game-changer for robotics-RL. Most modern research robotics labs in India work on sim-to-real problems.",
    tryItYourself:
      'In NVIDIA Isaac Lab (free), train an Ant robot to walk using PPO for 10 minutes. Vary friction and gravity during training. Save the policy, then run it under different sim parameters — that is sim-to-real in a sim-to-sim setting.',
    quiz: [
      {
        q: 'Sim-to-real transfer bridges policies between:',
        options: ['Two phones', 'Simulation and a real robot', 'Two simulators only', 'Two batteries'],
        answer: 1,
        explain: 'The whole point: train cheaply in sim, then deploy on the costly real robot.',
      },
      {
        q: 'Domain randomisation helps by:',
        options: ['Slowing the simulator', 'Varying sim parameters so the policy is robust to real variation', 'Making sim more visual only', 'Removing physics'],
        answer: 1,
        explain: 'By training under many randomised conditions, the policy generalises to the real distribution.',
      },
      {
        q: 'A famous sim-to-real success story is:',
        options: ['ASIMO walking', 'ANYmal quadruped learning rough-terrain walking in sim', 'A Roomba sweeping', 'A microwave timer'],
        answer: 1,
        explain: "ETH's ANYmal sim-to-real walking was a landmark for the field.",
      },
    ],
  },
  {
    slug: 'large-language-model-robotics',
    title: 'Large Language Models for Robotics — Complete Guide | R2BOT',
    description:
      "LLMs let robots understand natural-language instructions and reason about tasks. Foundation of Figure 02, RT-2, and the new humanoid wave.",
    bucket: 'ai-machine-learning',
    category: 'ai-and-perception',
    difficulty: 'advanced',
    tags: ['llm', 'foundation-model', 'language', 'reasoning', 'planning'],
    relatedTerms: ['transformer-architecture', 'foundation-model-robotics', 'reinforcement-learning', 'embodied-ai'],
    youtubeSearchQuery: 'LLM robotics natural language tutorial',
    definition:
      "Large Language Models (LLMs) like GPT-4, Claude, and Gemini are billion-to-trillion-parameter transformer networks trained on internet-scale text. In robotics, LLMs let robots understand natural-language commands, generate task plans, and even produce code that the robot can run.",
    howItWorks:
      "An LLM takes a text prompt (and optionally images) and predicts the next token over and over. In robotics it is paired with the robot stack two ways. **Code generation**: ask the LLM 'pick up the red cup' and it writes a few lines of Python that call existing robot primitives. **High-level planning**: the LLM breaks a complex goal into subgoals (find object → grasp → move → release) that lower-level controllers execute. Recent vision-language-action models like RT-2 and OpenVLA combine LLMs with image inputs and direct action outputs.",
    realWorld:
      "Figure 02 uses OpenAI's GPT for natural-language conversation. RT-2 maps language + image to motor actions. R2BOT's own Co-pilot uses Anthropic's Claude. Indian assistive-robotics startups like Manipal Hospital's pilot use LLM planners for elderly-care robots.",
    whyItMatters:
      "LLMs have made conversation-driven robotics a reality. Every modern humanoid programme now integrates an LLM. Robotics-AI engineering roles in India increasingly require both ROS2 and LLM-integration expertise.",
    tryItYourself:
      'Use the Anthropic SDK (free credits) to prompt Claude: "I have a robot with these primitives: move_to(x,y), pick(object), place(object). Write a plan to clear a table of 5 cups." Read the output — that is LLM-as-planner in action.',
    quiz: [
      {
        q: 'In a robotic LLM-as-planner setup, the LLM produces:',
        options: ['Motor PWM signals directly', 'High-level steps using available robot primitives', 'Battery telemetry', 'GPS coordinates only'],
        answer: 1,
        explain: 'The LLM produces a high-level plan; lower-level controllers execute the primitives.',
      },
      {
        q: 'RT-2 is a:',
        options: ['Vintage car', 'Vision-language-action model from Google DeepMind', 'A washing machine', 'A children\'s book'],
        answer: 1,
        explain: 'RT-2 takes image + language and outputs robot actions, trained on web data + robot data.',
      },
      {
        q: 'A key risk of using LLMs in robots is:',
        options: ['Too low intelligence', 'Hallucination — plausible-sounding but wrong outputs', 'High battery use only', 'No risk at all'],
        answer: 1,
        explain: 'LLMs sometimes hallucinate impossible or incorrect plans — guardrails and verifiers are essential.',
      },
    ],
  },
  {
    slug: 'diffusion-model',
    title: 'Diffusion Models in Robotics — Complete Guide | R2BOT',
    description:
      "Diffusion models generate data — including robot trajectories — by learning to reverse a noising process. Behind Stable Diffusion and Diffusion Policy.",
    bucket: 'ai-machine-learning',
    category: 'ai-and-perception',
    difficulty: 'advanced',
    tags: ['diffusion', 'generative', 'policy', 'trajectory', 'imitation'],
    relatedTerms: ['imitation-learning', 'reinforcement-learning', 'neural-network', 'foundation-model-robotics'],
    youtubeSearchQuery: 'diffusion policy robotics tutorial',
    definition:
      "Diffusion models are a class of generative networks that learn to generate data by reversing a step-by-step noising process. In robotics, Diffusion Policy uses the same idea to generate smooth, multi-modal robot trajectories from demonstrations.",
    howItWorks:
      "During training, real data (images or trajectories) is gradually corrupted with Gaussian noise across many steps. A neural network learns to denoise — predicting the original from a noisy version, conditioned on the timestep. At inference, you start from pure noise and run the denoiser repeatedly to produce a clean sample. In robotics, the model is conditioned on the current observation and outputs a chunk of future actions. Diffusion Policy famously handles multi-modal demonstrations (e.g., go around the obstacle left OR right) better than naive imitation learning.",
    realWorld:
      "Diffusion Policy by Cheng Chi (Columbia/Stanford) set new state-of-the-art on a range of manipulation benchmarks. Toyota Research Institute deploys diffusion-based controllers on dexterous arms. Indian academic groups at IIT Madras are exploring diffusion for crowd-aware navigation.",
    whyItMatters:
      "Diffusion is the hottest generative-modelling technique of the 2020s. Diffusion Policy gives robots smoother, more stable behaviour cloning than classical methods. Cutting-edge robotics-AI labs in India and globally are hiring engineers fluent in diffusion training.",
    tryItYourself:
      "Clone the Diffusion Policy code on GitHub and train on the provided push-T benchmark. Watch the noise gradually shape into a precise robot trajectory — it is the same algorithm that powers Stable Diffusion image generation, applied to robot actions.",
    quiz: [
      {
        q: 'A diffusion model is trained to:',
        options: ['Add noise to data', 'Reverse a noising process to generate clean samples', 'Compress images only', 'Predict the weather'],
        answer: 1,
        explain: 'The network learns to denoise — at inference you start from noise and iteratively denoise to a clean sample.',
      },
      {
        q: 'Diffusion Policy is particularly good at:',
        options: ['Linear regression', 'Multi-modal action distributions in imitation learning', 'Generating SQL queries', 'Tuning PID'],
        answer: 1,
        explain: 'Where naive imitation collapses on multi-modal demos, Diffusion Policy preserves and samples among modes.',
      },
      {
        q: 'A famous non-robotic application of diffusion is:',
        options: ['Spreadsheet calculations', 'Stable Diffusion image generation', 'Coffee brewing', 'TCP networking'],
        answer: 1,
        explain: 'The same diffusion-models concept powers AI image generators like Stable Diffusion, Midjourney, and DALL·E.',
      },
    ],
  },
  // ===== Computer Vision =====
  {
    slug: 'image-segmentation',
    title: 'Image Segmentation in Robotics — Complete Guide | R2BOT',
    description:
      'Image segmentation labels every pixel in an image with a class — essential for robot grasping, autonomous driving, and crop-disease detection.',
    bucket: 'computer-vision',
    category: 'ai-and-perception',
    difficulty: 'intermediate',
    tags: ['segmentation', 'vision', 'cnn', 'unet', 'semantic'],
    relatedTerms: ['semantic-segmentation', 'object-detection', 'computer-vision', 'convolutional-neural-network'],
    youtubeSearchQuery: 'image segmentation robotics tutorial',
    definition:
      "Image segmentation labels every pixel of an image with a class — for example, 'road', 'sky', 'pedestrian', 'crop', 'weed'. In robotics it provides the fine-grained understanding needed to grasp irregular objects, follow lanes, or weed a field.",
    howItWorks:
      "Modern segmentation uses fully-convolutional networks (FCNs) like U-Net, DeepLab, or SegFormer. The network takes an image and produces a per-pixel class map of the same resolution. Training uses pixel-labelled datasets (Cityscapes, COCO, ADE20K). For robotics, you typically fine-tune a pretrained model on a few hundred labelled images from your robot's camera. Inference runs at 10–100 FPS on Jetson-class devices.",
    realWorld:
      "Tesla and Waymo use segmentation for drivable area and pedestrian detection. Niqo Robotics (India) uses segmentation to spot diseased rice plants. Hospital cleaning robots segment floors vs walls vs furniture. Warehouse robots segment shelves vs aisles vs people.",
    whyItMatters:
      "Segmentation gives robots dense scene understanding — every pixel labelled. It is one of the most commercially valuable CV techniques today. Indian computer-vision job interviews routinely test U-Net and segmentation evaluation metrics.",
    tryItYourself:
      "Open Google Colab. Load a pretrained U-Net or SegFormer from Hugging Face. Run it on an image from your phone of an Indian street and visualise the per-pixel labels. Notice where it fails — that is your data-collection target.",
    quiz: [
      {
        q: 'Image segmentation produces:',
        options: ['Just a bounding box', 'A per-pixel class map', 'A single class label', 'Audio output'],
        answer: 1,
        explain: 'Segmentation labels every pixel with a class — denser than detection.',
      },
      {
        q: 'U-Net is famous for being:',
        options: ['A car model', 'A symmetric encoder-decoder segmentation architecture', 'A robot brand', 'A database'],
        answer: 1,
        explain: 'U-Net pioneered the encoder-decoder with skip connections that defined modern medical and robotic segmentation.',
      },
      {
        q: 'A typical use of segmentation in agritech is:',
        options: ['Predicting electricity prices', 'Distinguishing crops from weeds for selective spraying', 'Generating music', 'Stock trading'],
        answer: 1,
        explain: 'Pixel-precise crop/weed segmentation enables targeted herbicide application — saving cost and pollution.',
      },
    ],
  },
  {
    slug: 'pose-estimation',
    title: 'Pose Estimation in Robotics — Complete Guide | R2BOT',
    description:
      "Pose estimation predicts the 3D position and orientation of objects, people, or the robot itself. Critical for grasping, HRI, and AR overlays.",
    bucket: 'computer-vision',
    category: 'ai-and-perception',
    difficulty: 'intermediate',
    tags: ['pose', '6dof', 'vision', 'grasping', 'tracking'],
    relatedTerms: ['object-detection', 'visual-odometry', 'computer-vision', 'human-robot-interaction'],
    youtubeSearchQuery: 'pose estimation robotics tutorial',
    definition:
      "Pose estimation computes the 6-DOF position and orientation of an object, person, or robot from an image, point cloud, or other sensor. It is the gateway between perception (where is the object in the image) and action (how do I grasp or interact with it).",
    howItWorks:
      "There are several flavours. **2D human pose estimation** (OpenPose, MediaPipe) detects keypoints — wrists, elbows — on each detected person. **6-DOF object pose** (PoseCNN, DenseFusion) predicts an object's 3D translation and rotation from RGB or RGB-D. **Robot self-pose** uses visual odometry or SLAM. All use deep neural networks plus geometric back-end optimisation. Augmented-reality apps use marker-based pose (ArUco, AprilTag) for precise low-compute pose.",
    realWorld:
      "iPhone Face ID uses pose estimation to align your face. Body-tracking in MediaPipe is used in dozens of fitness apps. Robotic pick-and-place uses 6-DOF object pose to plan grasps. Drone AR overlays use marker pose. Indian motion-capture studios for film and gaming rely on body-pose estimation networks.",
    whyItMatters:
      "Without pose, a robot cannot grasp accurately, interact safely with humans, or place tools precisely. Pose estimation is the bridge from 'what is this object' to 'how do I touch it'. Every senior robotics CV role expects familiarity with 6-DOF pose pipelines.",
    tryItYourself:
      "Install MediaPipe in Python (one pip install). Run their pose-detection example on your webcam — see your 33 body keypoints tracked live. Then try the same on a Bharatanatyam dance video and watch the keypoints follow every mudra.",
    quiz: [
      {
        q: '6-DOF object pose estimates:',
        options: ['Just colour', 'Position (xyz) and orientation (roll, pitch, yaw)', 'Battery percentage', 'Network bandwidth'],
        answer: 1,
        explain: '6 DOF = 3 for position + 3 for orientation — the complete rigid-body pose.',
      },
      {
        q: 'MediaPipe is best known for:',
        options: ['SQL queries', 'Real-time human pose and hand tracking', 'Map navigation', 'Stock trading'],
        answer: 1,
        explain: "Google's MediaPipe ships fast, on-device human keypoint detectors used in countless apps.",
      },
      {
        q: 'ArUco markers are useful when you need:',
        options: ['Cheap, fast, accurate pose with minimal compute', 'Cinematic colour', 'Audio synthesis', 'Higher GPU usage'],
        answer: 0,
        explain: 'ArUco/AprilTag give instant pose with a printable marker and basic image processing.',
      },
    ],
  },
  {
    slug: 'visual-odometry',
    title: 'Visual Odometry in Robotics — Complete Guide | R2BOT',
    description:
      "Visual odometry estimates a robot's motion from camera images alone. Powers ARCore, ARKit, and the navigation of drones indoors.",
    bucket: 'computer-vision',
    category: 'ai-and-perception',
    difficulty: 'advanced',
    tags: ['visual-odometry', 'vo', 'slam', 'tracking', 'motion-estimation'],
    relatedTerms: ['visual-slam', 'feature-extraction', 'sensor-fusion', 'optical-flow-sensor', 'camera-vision'],
    youtubeSearchQuery: 'visual odometry tutorial robotics',
    definition:
      "Visual odometry (VO) estimates a robot's motion — translation and rotation — by tracking visual features between successive camera frames. Like wheel odometry but using a camera instead of encoders. It is the foundation of visual SLAM and the core of every smartphone AR experience.",
    howItWorks:
      "At each new frame, the system detects keypoints (ORB, SIFT, or learned features) and matches them to the previous frame. From the 2D-to-2D correspondences it computes the camera's motion using the essential matrix (monocular) or PnP (depth or stereo). Bundle adjustment refines pose and 3D point positions over a sliding window. With IMU fusion (visual-inertial odometry, VIO), accuracy and robustness improve dramatically. Common open-source VO/VIO systems: ORB-SLAM3, VINS-Fusion, OpenVINS.",
    realWorld:
      "Google ARCore and Apple ARKit use VIO to anchor AR objects in the world. DJI drones use VIO to fly indoors without GPS. Boston Dynamics Spot uses VIO for short-range navigation. Indian AR-glass startups (Dimension AR, Cosmos AR) rely on VIO for their core products.",
    whyItMatters:
      "VO unlocks navigation without GPS, expensive wheel encoders, or external trackers. It is a foundation skill for drone, AR, and indoor-robotics careers. Most modern visual-SLAM systems are built on a VO front-end.",
    tryItYourself:
      'Install ORB-SLAM3 on Ubuntu. Feed it a video from your phone walking around your home. Watch the system build a 3D point cloud and trace your trajectory live — your first VIO experience.',
    quiz: [
      {
        q: 'Visual odometry estimates motion using:',
        options: ['LIDAR only', 'Camera images', 'GPS only', 'Microphone audio'],
        answer: 1,
        explain: 'VO derives motion from feature tracking in image sequences — no LIDAR or GPS needed.',
      },
      {
        q: 'VIO is VO combined with:',
        options: ['Wi-Fi', 'IMU data for robustness', 'Bluetooth', 'Stock market data'],
        answer: 1,
        explain: 'Visual-inertial odometry fuses an IMU with the camera to handle fast motion and visual ambiguity.',
      },
      {
        q: 'A famous open-source VIO/SLAM system is:',
        options: ['Microsoft Excel', 'ORB-SLAM3', 'Spotify', 'OBS Studio'],
        answer: 1,
        explain: 'ORB-SLAM3 is one of the most-cited open-source visual-inertial SLAM systems.',
      },
    ],
  },
  {
    slug: 'augmented-reality',
    title: 'Augmented Reality in Robotics — Complete Guide | R2BOT',
    description:
      "AR overlays virtual content on the real world. In robotics it is used for teleoperation, training, maintenance, and safety visualisation.",
    bucket: 'computer-vision',
    category: 'ai-and-perception',
    difficulty: 'intermediate',
    tags: ['ar', 'augmented-reality', 'teleoperation', 'mixed-reality', 'training'],
    relatedTerms: ['pose-estimation', 'visual-odometry', 'teleoperation', 'haptic-feedback'],
    youtubeSearchQuery: 'augmented reality robotics teleoperation tutorial',
    definition:
      "Augmented reality (AR) overlays computer-generated content — images, text, 3D models — onto the user's view of the real world. In robotics, AR is used to visualise a robot's plan, train operators, project safety zones, and remotely supervise robots.",
    howItWorks:
      "AR systems (Apple Vision Pro, Meta Quest 3, Hololens 2) track the user's head pose using IMUs and cameras (VIO). They then render virtual objects from the correct perspective and composite them with the real-world view. ROS2 plugins like rviz_satellite let an operator see a robot's planned path overlaid on the real world via AR glasses. AR markers (ArUco, AprilTag) anchor virtual objects to physical objects with millimetre precision.",
    realWorld:
      "Boeing technicians use Hololens to wire aircraft harnesses — AR overlays guide each connection. Apollo Hospitals trains surgical-robot operators with AR. Indian Defence (BEL, BEML) is piloting AR for tank-maintenance training. Tesla service centres use AR for repair walkthroughs.",
    whyItMatters:
      "AR collapses the gap between human and robot understanding. As humanoids and cobots roll out, AR will become the standard supervisory interface. Robotics + AR is one of the fastest-growing intersections, with rich career paths in India's gaming, defence, and manufacturing sectors.",
    tryItYourself:
      "Install Apple's RoomPlan or Google's ARCore Scene Viewer on your phone. Scan a room and overlay a virtual robot model in it. Move around to see the persistent anchor — that is the same technology used in commercial AR teleoperation.",
    quiz: [
      {
        q: 'AR overlays:',
        options: ['Real content on virtual environments', 'Virtual content on the real world', 'Audio over silence', 'A new keyboard'],
        answer: 1,
        explain: 'AR augments the real world with virtual elements; VR replaces it entirely.',
      },
      {
        q: 'AR in robotics is commonly used for:',
        options: ['Robot parts manufacturing only', 'Operator training and supervision', 'Frying food', 'Generating MP3s'],
        answer: 1,
        explain: 'AR helps humans understand and supervise robots — training, maintenance, planning overlays.',
      },
      {
        q: 'Which is a popular AR headset?',
        options: ['Microsoft Hololens', 'A microwave', 'A photo frame', 'A regular smartphone case'],
        answer: 0,
        explain: 'Hololens 2 is a leading enterprise AR headset; Apple Vision Pro and Meta Quest 3 also do AR/MR.',
      },
    ],
  },
  // ===== Navigation =====
  {
    slug: 'visual-slam',
    title: 'Visual SLAM in Robotics — Complete Guide | R2BOT',
    description:
      "Visual SLAM uses only camera input to simultaneously map an environment and localise the robot. Powers AR, drones, and budget AMRs.",
    bucket: 'navigation-localization',
    category: 'ai-and-perception',
    difficulty: 'advanced',
    tags: ['visual-slam', 'slam', 'vslam', 'orb-slam', 'mapping'],
    relatedTerms: ['slam', 'lidar-slam', 'visual-odometry', 'feature-extraction', 'sensor-fusion'],
    youtubeSearchQuery: 'visual SLAM ORB-SLAM3 tutorial',
    definition:
      "Visual SLAM (vSLAM) is the family of SLAM algorithms that use only camera input — sometimes plus an IMU — to simultaneously build a map of the environment and track the robot's pose within it. Cheaper than LIDAR-SLAM and dense with semantic information.",
    howItWorks:
      "vSLAM has three parts: a tracking front-end that estimates frame-to-frame motion via feature matching (visual odometry); a local mapping module that maintains a sparse 3D point cloud and adjusts it via bundle adjustment; and a loop-closure detector that recognises previously visited places to fix drift. Famous systems include ORB-SLAM3 (sparse, feature-based), DSO (direct, photometric), and learned variants like DROID-SLAM. Adding inertial data gives visual-inertial SLAM (VI-SLAM) — much more robust.",
    realWorld:
      "Google ARCore and Apple ARKit are productionised vSLAM. DJI drones use VIO/vSLAM indoors. Cheaper warehouse robots (some GreyOrange variants, indoor inspection drones) use vSLAM to avoid LIDAR cost. Indian indoor-inspection startups (Aero360, Skylark Drones) build on top of ORB-SLAM3.",
    whyItMatters:
      "vSLAM is the cheapest path to autonomous indoor navigation. Combined with the ubiquity of cameras and the rise of foundation models for vision, vSLAM is at the heart of the next decade of consumer and industrial mobile robots.",
    tryItYourself:
      "Install ORB-SLAM3. Feed it the TUM RGB-D dataset or a video from your phone. Watch the system build a sparse map of the environment and trace your trajectory. Compare with LIDAR-SLAM on the same scene — you'll feel the trade-offs first-hand.",
    quiz: [
      {
        q: 'Visual SLAM relies primarily on:',
        options: ['GPS', 'Cameras (sometimes plus IMU)', 'Wheel encoders only', 'A microwave'],
        answer: 1,
        explain: 'vSLAM uses camera (and optional IMU) — no LIDAR or GPS needed.',
      },
      {
        q: 'Loop closure in SLAM is when:',
        options: ['The battery dies', 'The robot recognises a previously visited place and corrects accumulated drift', 'The Wi-Fi reconnects', 'A new sensor is added'],
        answer: 1,
        explain: 'Recognising a re-visit lets the optimiser close the loop in the trajectory graph and correct drift.',
      },
      {
        q: 'A famous open-source vSLAM system is:',
        options: ['ORB-SLAM3', 'Microsoft Word', 'PostgreSQL', 'Photoshop'],
        answer: 0,
        explain: 'ORB-SLAM3 is the de-facto baseline for visual and visual-inertial SLAM research.',
      },
    ],
  },
  {
    slug: 'lidar-slam',
    title: 'LIDAR SLAM in Robotics — Complete Guide | R2BOT',
    description:
      "LIDAR SLAM uses laser-scan data to map an environment and localise a robot. The gold standard for accuracy in warehouse and outdoor AMRs.",
    bucket: 'navigation-localization',
    category: 'ai-and-perception',
    difficulty: 'advanced',
    tags: ['lidar-slam', 'slam', 'cartographer', 'point-cloud', 'mapping'],
    relatedTerms: ['slam', 'visual-slam', 'lidar', 'occupancy-grid', 'amcl'],
    youtubeSearchQuery: 'LIDAR SLAM cartographer tutorial',
    definition:
      "LIDAR SLAM uses laser range data to simultaneously map an environment and localise the robot. Compared with visual SLAM, LIDAR is robust to lighting, gives precise distances, and offers wide field of view — at higher hardware cost.",
    howItWorks:
      "At each scan, the LIDAR returns thousands of distance measurements. A scan-matching algorithm (ICP or correlative) aligns the new scan with the running map to estimate the robot's pose. Maps are stored as 2D occupancy grids (planar LIDAR) or 3D point clouds / voxel grids (3D LIDAR). Modern systems like Google Cartographer build pose graphs and run loop closure plus bundle adjustment. ROS2 ships LIDAR-SLAM stacks via the SLAM Toolbox and Cartographer packages.",
    realWorld:
      "Waymo, Cruise, and Indian autonomous-tractor startup TartanSense rely on LIDAR SLAM for outdoor localisation. Warehouse robots from GreyOrange and Locus Robotics use 2D LIDAR + AMCL for indoor localisation. Boston Dynamics Spot fuses LIDAR with vision for mixed environments.",
    whyItMatters:
      "LIDAR SLAM remains the standard for high-accuracy, all-weather localisation. Roboticists targeting warehouse, AMR, or autonomous-driving roles need to understand it intimately. Cartographer and SLAM Toolbox are common interview topics.",
    tryItYourself:
      "In ROS2 Gazebo, simulate a TurtleBot4 with LIDAR. Run the SLAM Toolbox launch file and drive the robot with the teleop keyboard. Watch a map of the simulated house build up in real time on RViz — that is LIDAR SLAM in action.",
    quiz: [
      {
        q: 'LIDAR SLAM uses:',
        options: ['Audio waves', 'Laser range returns to map and localise', 'Pure GPS only', 'Magnetic compass only'],
        answer: 1,
        explain: 'LIDAR provides precise distance measurements; scan-matching produces pose and map.',
      },
      {
        q: 'A famous LIDAR SLAM package by Google is:',
        options: ['Search', 'Cartographer', 'Maps app', 'YouTube'],
        answer: 1,
        explain: 'Google Cartographer is a widely used real-time SLAM system supporting 2D and 3D LIDAR.',
      },
      {
        q: 'Compared with vSLAM, LIDAR SLAM:',
        options: ['Has lower accuracy', 'Is less affected by lighting and gives precise ranges', 'Cannot be used outdoors', 'Has no real use case'],
        answer: 1,
        explain: 'LIDAR is robust to lighting and gives direct distance — its main advantages over cameras.',
      },
    ],
  },
  {
    slug: 'amcl',
    title: 'AMCL (Adaptive Monte Carlo Localisation) — Complete Guide | R2BOT',
    description:
      "AMCL is ROS2's standard particle-filter localiser. Given a known map, it tracks where the robot is using laser scans.",
    bucket: 'navigation-localization',
    category: 'ai-and-perception',
    difficulty: 'intermediate',
    tags: ['amcl', 'particle-filter', 'localisation', 'ros2', 'nav2'],
    relatedTerms: ['particle-filter', 'slam', 'lidar-slam', 'occupancy-grid', 'nav2-stack'],
    youtubeSearchQuery: 'AMCL ROS2 navigation tutorial',
    definition:
      "AMCL (Adaptive Monte Carlo Localisation) is a particle-filter algorithm that localises a robot in a previously built map using LIDAR (or sonar) data. It is the default localiser in ROS2 Nav2 and runs on thousands of mobile robots worldwide.",
    howItWorks:
      "AMCL maintains a population of particle hypotheses about the robot's pose. At each control step it predicts each particle forward using odometry plus noise, then weights it by how well its predicted scan matches the actual LIDAR scan. Resampling concentrates particles on high-likelihood poses. The 'adaptive' part dynamically adjusts the number of particles based on convergence — fewer when localised, more when uncertain (e.g., after the robot is kidnapped).",
    realWorld:
      "Almost every Nav2-based robot uses AMCL out of the box. GreyOrange Butlers, Robotis TurtleBots, hospital delivery robots, and Indian academic mobile-robotics projects all rely on it. AMCL handles minor map changes (people walking by) gracefully.",
    whyItMatters:
      "AMCL is the first localiser most ROS2 users touch. Knowing how to tune its parameters — number of particles, motion model noise, laser model — is essential for any real deployment. AMCL bugs (poor convergence, slow recovery) are a daily occurrence in production.",
    tryItYourself:
      "Launch the Nav2 TurtleBot3 demo in Gazebo. Use RViz to publish an initial pose estimate and watch the particle cloud collapse. Then teleport the robot to a random spot and use the '2D Pose Estimate' tool to recover — feel AMCL converge.",
    quiz: [
      {
        q: 'AMCL is based on which underlying algorithm?',
        options: ['Kalman filter', 'Particle filter', 'A* search', 'Gradient descent'],
        answer: 1,
        explain: 'AMCL stands for Adaptive Monte Carlo Localisation — Monte Carlo = particle filter.',
      },
      {
        q: 'AMCL requires:',
        options: ['Only GPS', 'A pre-built map plus laser/sensor data', 'No sensors at all', 'A neural network'],
        answer: 1,
        explain: 'AMCL is a localiser, not a SLAM system — you give it a map and current sensor data.',
      },
      {
        q: 'The "adaptive" in AMCL refers to:',
        options: ['Adaptive Wi-Fi', 'Adjusting the number of particles based on convergence', 'Changing the robot colour', 'Adapting the battery'],
        answer: 1,
        explain: 'AMCL increases particles when uncertain and decreases when localised — saving compute.',
      },
    ],
  },
  {
    slug: 'rrt',
    title: 'RRT (Rapidly-exploring Random Tree) — Complete Guide | R2BOT',
    description:
      'RRT is a sampling-based motion-planning algorithm that finds paths in complex high-DOF spaces. Standard for robotic arms and self-driving cars.',
    bucket: 'navigation-localization',
    category: 'ai-and-perception',
    difficulty: 'advanced',
    tags: ['rrt', 'planning', 'sampling', 'motion-planning', 'tree'],
    relatedTerms: ['path-planning', 'motion-planning', 'a-star-algorithm', 'inverse-kinematics'],
    youtubeSearchQuery: 'RRT motion planning robotics explained',
    definition:
      "RRT (Rapidly-exploring Random Tree) is a sampling-based path-planning algorithm that builds a tree of feasible states by randomly sampling the configuration space and growing the tree toward each sample. RRT excels in high-dimensional spaces where grid-based methods like A* fail.",
    howItWorks:
      "Start with a tree containing only the start state. Randomly sample a point in the configuration space. Find the nearest node already in the tree. Extend a short distance from that node toward the sample. If the extension is collision-free, add it as a new node. Repeat until a node is close enough to the goal. RRT is probabilistically complete and easy to implement, but the resulting path is not optimal. RRT* and informed-RRT* variants converge to optimal paths in the limit.",
    realWorld:
      "MoveIt2 ships RRT-Connect as its default arm planner. NASA's Mars rovers use RRT-derived planners. Tesla's autonomous lane-change planner is RRT-based. Indian robotics groups use RRT for 6+ DOF arm planning.",
    whyItMatters:
      "RRT is the workhorse algorithm for motion planning in spaces too big for grid search. Knowing RRT, RRT*, and their variants is mandatory for manipulation and autonomous-driving engineers. Indian PhD interviews routinely test RRT theory.",
    tryItYourself:
      'Open `/visualizer` and load the RRT demo. Draw obstacles in a 2D maze, place start and goal, and step through RRT one sample at a time. Watch the tree grow and the first feasible path emerge.',
    quiz: [
      {
        q: 'RRT samples:',
        options: ['Only the start state', 'Random points in the configuration space', 'Only the goal', 'Battery levels'],
        answer: 1,
        explain: 'Each iteration draws a random sample and extends the tree toward it.',
      },
      {
        q: 'Compared with A*, RRT is better at:',
        options: ['Small 2D grids', 'High-dimensional continuous spaces (e.g., 7-DOF arms)', 'Database lookups', 'Audio compression'],
        answer: 1,
        explain: 'Sampling-based planners scale to high-DOF spaces where grid search is intractable.',
      },
      {
        q: 'RRT* differs from RRT by:',
        options: ['Using gradient descent', 'Re-wiring the tree to converge toward optimal paths', 'Running slower for no reason', 'Using sound waves'],
        answer: 1,
        explain: 'RRT* periodically re-wires nearby nodes for lower cost — asymptotically optimal.',
      },
    ],
  },
  {
    slug: 'costmap',
    title: 'Costmap in ROS2 Navigation — Complete Guide | R2BOT',
    description:
      "A costmap is a 2D grid where each cell holds a cost reflecting how desirable it is to traverse. Backbone of Nav2 local and global planners.",
    bucket: 'navigation-localization',
    category: 'ai-and-perception',
    difficulty: 'intermediate',
    tags: ['costmap', 'nav2', 'ros2', 'navigation', 'inflation'],
    relatedTerms: ['nav2-stack', 'path-planning', 'occupancy-grid', 'a-star-algorithm', 'ros2'],
    youtubeSearchQuery: 'ROS2 Nav2 costmap layers tutorial',
    definition:
      "A costmap is a 2D grid representation of the world where each cell holds a numeric cost indicating how undesirable it is for the robot to be there. Obstacles get high cost, free space gets zero, and areas near obstacles get inflated cost. Planners like A* and Dijkstra navigate by minimising total path cost.",
    howItWorks:
      "Nav2 builds costmaps in layers. The static layer reads a known map. The obstacle layer adds dynamic obstacles from LIDAR/depth sensors. The inflation layer adds a halo of decreasing cost around every obstacle to keep the robot at a safe distance. The voxel layer extends to 3D. Each layer can be enabled or disabled per planner. The global costmap covers the entire environment for long-range planning; the local costmap is a small, fast-updating window around the robot for reactive avoidance.",
    realWorld:
      "Every Nav2-based warehouse robot uses costmaps with inflation tuned to its physical width. Hospital delivery robots inflate human-sized buffers around detected legs. Outdoor mowing robots add custom layers for grass-height and slope.",
    whyItMatters:
      "Costmap tuning is the single most impactful factor in whether a Nav2 robot behaves well or terribly. Inflation radius too low → robot scrapes walls. Too high → robot refuses to enter narrow doorways. Every Nav2 engineer must master costmap layers and parameters.",
    tryItYourself:
      "Launch the Nav2 TurtleBot3 demo in Gazebo + RViz2. Visualise the global and local costmaps in RViz. Change the inflation radius parameter live with `ros2 param set` and watch the robot's path change in real time.",
    quiz: [
      {
        q: 'A costmap cell encodes:',
        options: ['Battery level', 'How costly it is for the robot to traverse that cell', 'GPS time', 'Audio sample'],
        answer: 1,
        explain: 'Higher cost = more undesirable; obstacles are highest, free space is lowest.',
      },
      {
        q: 'The inflation layer in Nav2 adds:',
        options: ['Random noise', 'A decaying cost halo around obstacles', 'Audio comments', 'Sensor calibration'],
        answer: 1,
        explain: 'Inflation keeps the planned path away from walls by extending cost outward from obstacles.',
      },
      {
        q: 'Local vs global costmaps differ in:',
        options: ['Material', 'Range and update frequency', 'Manufacturer', 'Programming language'],
        answer: 1,
        explain: 'Global covers the whole map slowly; local covers a window around the robot quickly.',
      },
    ],
  },
];
