// app/tools/motor-torque-calculator — calculator 1 of 3 (gear ratio and battery
// runtime follow). Owns the tool query "motor torque calculator" / "robot motor
// torque calculator"; the Atlas torque entry owns "what is torque" and both link
// to each other (lib/canonical-map.ts).
//
// The page is written to be useful with JavaScript off: every formula, the
// worked examples (computed at build time from the same functions the widget
// uses, so the numbers can never disagree) and the motor-choice advice are
// server HTML. The widget is the convenience on top.
import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPage } from '@/components/StaticPage'
import InlineSignup from '@/components/InlineSignup'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import { PAGE_UPDATED } from '@/lib/content-dates'
import {
  G,
  SURFACES,
  armTorques,
  convertTorque,
  driveTorque,
} from '@/lib/calculators/motor-torque'
import MotorTorqueCalculatorClient from './MotorTorqueCalculatorClient'

export const revalidate = 86400

const BASE = 'https://www.r2bot.in'
const PATH = '/tools/motor-torque-calculator'
const URL = `${BASE}${PATH}`
const UPDATED = PAGE_UPDATED[PATH]

const TITLE = 'Motor Torque Calculator for Robots (Wheels and Arm Joints)'
const DESCRIPTION =
  'Free robot motor torque calculator: size drive motors from mass, wheel size, slope and acceleration, or arm joints from link lengths and payload. Shows the formulas.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, siteName: 'R2BOT', title: TITLE, description: DESCRIPTION },
}

const SOURCES = [
  { title: 'Drive Motor Sizing Tutorial — RobotShop Community', url: 'https://community.robotshop.com/blog/show/drive-motor-sizing-tutorial' },
  { title: 'Rolling Resistance — The Engineering ToolBox', url: 'https://www.engineeringtoolbox.com/rolling-friction-resistance-d_1303.html' },
  { title: 'Rolling resistance — Wikipedia (coefficient table)', url: 'https://en.wikipedia.org/wiki/Rolling_resistance' },
  { title: 'Selecting a DC motor to run at 25% of stall current — Pololu Forum (Pololu staff answer, Oct 2020)', url: 'https://forum.pololu.com/t/selecting-a-dc-motor-to-run-at-25-of-stall-current/20217' },
  { title: 'K. M. Lynch & F. C. Park, Modern Robotics: Mechanics, Planning, and Control (Cambridge University Press, 2017) — free preprint', url: 'https://hades.mech.northwestern.edu/index.php/Modern_Robotics' },
  { title: 'Standard gravity (9.80665 m/s², defined value) — Wikipedia', url: 'https://en.wikipedia.org/wiki/Standard_gravity' },
]

// Worked examples, computed with the widget's own functions.
const EX_DRIVE = { massKg: 5, wheelDiameterM: 0.1, motors: 2, slopeDeg: 10, speedMs: 1, accelMs2: 0.5, crr: 0.015, efficiency: 1 }
const exDrive = driveTorque(EX_DRIVE)
const exFlat = driveTorque({ ...EX_DRIVE, slopeDeg: 0 })
const EX_ARM = {
  links: [
    { lengthM: 0.2, massKg: 0.15, endMassKg: 0.06 },
    { lengthM: 0.15, massKg: 0.1, endMassKg: 0 },
  ],
  payloadKg: 0.1,
  alphaRad: (90 * Math.PI) / 180,
}
const exArm = armTorques(EX_ARM)

const n = (x: number, d = 2) => x.toLocaleString('en', { maximumFractionDigits: d, minimumFractionDigits: d })
const kgcm = (nm: number) => n(convertTorque(nm, 'kgcm'), 1)

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How do I convert N·m to kg·cm?',
    a: 'Multiply by 10.197. One newton-metre is 100 cm ÷ 9.80665 N per kilogram-force = 10.197 kgf·cm. Going the other way, 1 kg·cm = 0.0981 N·m. Hobby servo and gearmotor listings usually quote kg·cm; datasheets for industrial motors use N·m. 1 N·m is also 141.6 oz·in.',
  },
  {
    q: 'Why does wheel size matter so much?',
    a: 'Torque is force times radius. Double the wheel diameter and the same motor needs twice the torque to push the robot with the same force, while the wheel needs only half the RPM for the same speed. That trade is exactly what a gearbox makes, which is why big wheels usually come with a higher gear ratio.',
  },
  {
    q: 'Do caster wheels count as driven wheels?',
    a: 'No. Count only wheels with a motor. A differential-drive robot with two motors and a caster has two. The caster still carries weight and adds rolling resistance. The calculator counts it at the same coefficient as the drive wheels, but small casters are often worse, so measure the whole robot (see “Measuring rolling resistance”).',
  },
  {
    q: 'Is the result the torque at the motor or at the wheel?',
    a: 'It is the torque the motor’s output shaft must deliver if that shaft turns at wheel speed. If the wheel sits directly on a gearmotor’s output shaft, set efficiency to 100% and compare the result with the gearmotor’s output torque on its datasheet (the gearbox losses are already in that figure). If there is a further belt or gear stage of ratio k between that shaft and the wheel, set the efficiency to that stage’s efficiency, divide the torque by k and multiply the RPM by k. The RPM shown is always the wheel’s.',
  },
  {
    q: 'Can a stepper motor be sized the same way?',
    a: 'The torque you need is the same; how you read the motor is different. A stepper’s torque falls as step rate rises, so check its pull-out torque curve at the speed you need rather than the holding torque printed on the label. The 25%-of-stall rule below is for brushed DC motors and does not apply to steppers.',
  },
]

export default function MotorTorqueCalculatorPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Robot Motor Torque Calculator',
      url: URL,
      description: DESCRIPTION,
      applicationCategory: 'EngineeringApplication',
      operatingSystem: 'Any (runs in the browser)',
      isAccessibleForFree: true,
      dateModified: UPDATED,
      author: authorRef(),
      publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE },
      citation: SOURCES.map((s) => s.url),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Simulators', item: `${BASE}/visualizer` },
        { '@type': 'ListItem', position: 2, name: 'Motor torque calculator', item: URL },
      ],
    },
  ]

  return (
    <StaticPage
      eyebrow="Build · Calculator"
      title="Motor torque calculator"
      lede="How much torque does your robot's motor need? Enter the robot's weight, wheel size and the steepest slope it must climb, or an arm's link lengths and payload, and get the torque, speed and power to look for on a motor datasheet."
      maxWidth={880}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="not-prose -mt-6 mb-4 text-xs text-gray-500">
        <Link href="/visualizer" className="inline-flex min-h-[44px] items-center hover:text-white hover:underline">Simulators</Link>
        <span aria-hidden> / </span>
        <span className="text-gray-400">Motor torque calculator</span>
      </nav>

      <article>
        <MotorTorqueCalculatorClient />

        <h2 id="short-answer">The short answer</h2>
        <p>
          A motor has to supply enough <Link href="/atlas/concept/torque">torque</Link> (turning force) to beat three
          things: the rolling resistance of the wheels, the pull of gravity down a slope, and the force needed to speed up.
          Add those forces, multiply by the wheel radius, share the result between the driven wheels, and you have the
          torque each motor must deliver. For an arm, gravity acting on every part beyond a joint is what that joint must
          hold up, and it is worst when the arm is stretched out flat.
        </p>

        <h2 id="wheeled">Wheeled robot: the formula</h2>
        <p>The force along the ground needed to climb a slope of angle θ while accelerating at <em>a</em>:</p>
        <pre className="not-prose overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-[13px] leading-relaxed text-gray-100"><code>{`F = Crr·m·g·cos θ   (rolling resistance)
  + m·g·sin θ       (slope)
  + m·a             (acceleration)

torque per motor  τ = F · r / (N · η)
wheel speed       RPM = v / (2π·r) · 60
power per motor   P = τ · v / r`}</code></pre>
        <p>
          Here <em>m</em> is the all-up mass, <em>g</em> = {G} m/s², <em>r</em> the wheel radius, <em>N</em> the number of
          driven wheels and <em>η</em> the efficiency of whatever sits between the motor shaft and the wheel. This is the
          same force balance RobotShop’s drive-motor sizing tutorial uses, with one term made explicit: rolling
          resistance, which that tutorial mentions but does not put a number on. It matters most on soft ground: the
          published coefficient for loose sand is roughly 13 to 40 times that for a hard floor.
        </p>
        <p>
          The calculator reports two numbers. <strong>Continuous</strong> torque holds top speed on the steepest slope;
          that is what the motor does for minutes at a time, so it decides whether the motor overheats.{' '}
          <strong>Peak</strong> torque adds the acceleration; it lasts a second or two, so it decides whether the motor
          stalls.
        </p>

        <h3 id="drive-example">Worked example</h3>
        <p>
          A {EX_DRIVE.massKg} kg two-wheel-drive robot on {EX_DRIVE.wheelDiameterM * 1000} mm wheels must climb a{' '}
          {EX_DRIVE.slopeDeg}° ramp at {EX_DRIVE.speedMs} m/s and accelerate at {EX_DRIVE.accelMs2} m/s² on a hard floor
          (Crr {EX_DRIVE.crr}), with the wheels mounted directly on the gearmotor shafts (efficiency 100%).
        </p>
        <ul>
          <li>Rolling resistance: {n(exDrive.forces.rolling)} N. Slope: {n(exDrive.forces.grade)} N. Acceleration: {n(exDrive.forces.accel)} N.</li>
          <li>Total force while accelerating up the ramp: {n(exDrive.peakForceN)} N.</li>
          <li>
            Per motor: {n(exDrive.steadyTorqueNm, 3)} N·m continuous ({kgcm(exDrive.steadyTorqueNm)} kg·cm), {n(exDrive.peakTorqueNm, 3)} N·m
            peak ({kgcm(exDrive.peakTorqueNm)} kg·cm).
          </li>
          <li>Wheel speed {n(exDrive.wheelRpm, 0)} RPM; {n(exDrive.steadyPowerW, 1)} W per motor at top speed on the ramp.</li>
        </ul>
        <p>
          Notice that the slope supplies most of the force. On the flat, the same robot needs {n(exFlat.peakTorqueNm, 3)} N·m
          peak per motor, {Math.round((exFlat.peakTorqueNm / exDrive.peakTorqueNm) * 100)}% of the ramp figure. If your
          robot never leaves a flat floor, set the slope to 0 and you can use a smaller motor.
        </p>

        <h3 id="rolling-resistance">Measuring rolling resistance</h3>
        <p>
          The coefficient Crr is the force needed to keep a wheel rolling divided by the weight on it. The surface presets
          in the calculator come from published tables, which are measured for car tyres (and, in the first row, railway
          wheels), not robot wheels:
        </p>
        <ul>
          {SURFACES.map((s) => (
            <li key={s.id}>
              <strong>{s.label}</strong>: {s.crr} — from the table row “{s.note}”.
            </li>
          ))}
        </ul>
        <p>
          Small soft wheels, carpet and cheap casters can be well above these. To measure your own, disconnect the motor
          wires (a shorted motor, or a driver in brake mode, acts as a brake), put the robot on a long board and raise one
          end slowly until, after a light nudge, the robot neither slows to a stop nor speeds up. At that angle the slope
          force equals rolling resistance, so Crr ≈ tan(angle). The angles are tiny (Crr 0.015 is under 1°), so measure
          the rise and the length along the board and use Crr ≈ rise ÷ length. The result includes gearbox and motor
          friction, so if you also set efficiency below 100% you count those losses twice, which errs on the safe side.
          If the gearbox will not back-drive, take the wheels off the motors, or fit the same wheels to a free-rolling cart
          carrying the same weight, and repeat the test; or pull it at a steady speed with a luggage scale: Crr ≈ pulling
          force ÷ weight, both in the same unit.
        </p>

        <h2 id="arm">Robot arm joint: the formula</h2>
        <p>
          A joint has to hold up everything beyond it. The worst case is the arm stretched out horizontally, because then
          every mass sits at its full lever arm. For a joint that pivots about a horizontal axis, with only that joint
          moving and the base fixed, the torque is
        </p>
        <pre className="not-prose overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-[13px] leading-relaxed text-gray-100"><code>{`τ = g · Σ mᵢ·dᵢ   +   α · Σ Iᵢ

dᵢ  horizontal distance from the joint to mass i
    (a link's mass acts at its middle; a motor or payload at its own position)
Iᵢ  mᵢ·dᵢ²  (+ m·L²/12 for each link, a uniform bar)
α   angular acceleration of the joint, rad/s²`}</code></pre>
        <p>
          The first term is the holding torque; the second is the extra needed to swing the arm up. In the horizontal pose
          the centripetal forces point along the arm and add no torque about the joint, so this is exact for that pose; for
          a full treatment of the statics and dynamics of open chains see Lynch and Park’s <em>Modern Robotics</em>.
        </p>

        <h3 id="arm-example">Worked example</h3>
        <p>
          A two-link desktop arm: a 20 cm upper arm weighing 150 g, a 60 g elbow motor, a 15 cm forearm weighing 100 g and
          a 100 g gripper plus payload, accelerating at 90°/s².
        </p>
        <ul>
          <li>
            Shoulder: {n(exArm[0].holdNm, 3)} N·m to hold ({kgcm(exArm[0].holdNm)} kg·cm), {n(exArm[0].totalNm, 3)} N·m
            ({kgcm(exArm[0].totalNm)} kg·cm) including acceleration.
          </li>
          <li>
            Elbow: {n(exArm[1].holdNm, 3)} N·m to hold ({kgcm(exArm[1].holdNm)} kg·cm), {n(exArm[1].totalNm, 3)} N·m
            ({kgcm(exArm[1].totalNm)} kg·cm) including acceleration.
          </li>
        </ul>
        <p>
          Holding dominates: at this acceleration the extra term is a few percent. At the shoulder the payload contributes the most
          because it sits furthest out. That is the reason to keep heavy parts near the base and the wrist light, and why
          some arms add a counterweight or a spring at the shoulder.
        </p>

        <h2 id="choose-motor">From torque to an actual motor</h2>
        <ol>
          <li>
            <strong>Leave room below stall.</strong> A brushed DC motor’s current rises in a straight line with load
            torque, from its no-load current to its stall current. Pololu’s datasheets give a general recommendation for
            brushed DC motors: 25% or less of stall current, which their staff equate to roughly 25% or less of stall
            torque. Their staff say running continuously at 41% of stall current is not recommended because it shortens the
            motor’s life. So look for a stall torque at least four times your continuous torque, and at least twice your
            peak torque so a sagging battery or a warm motor still gets you up to speed (that 2× is our margin, not
            Pololu’s). Read the stall torque at the voltage you will actually run. The calculator shows the larger figure.
          </li>
          <li>
            <strong>Check the speed at that torque, not the no-load speed.</strong> A DC motor slows as the load rises.
            Read the RPM off the torque–speed curve at your continuous torque and check it still reaches the wheel RPM
            the calculator gives.
          </li>
          <li>
            <strong>Use the gear ratio to trade speed for torque.</strong> If no motor fits both numbers directly, a gearbox
            multiplies torque by its ratio (less its losses) and divides speed by the same ratio. See{' '}
            <Link href="/atlas/concept/gear-ratio">gear ratio</Link> and{' '}
            <Link href="/atlas/concept/planetary-gearbox">planetary gearbox</Link>.
          </li>
          <li>
            <strong>Check that the motor driver can supply the peak current</strong>, then size the battery from the
            power figure divided by the motor’s efficiency: the figure shown is mechanical power at the shaft, and the
            electrical power drawn is always more. See <Link href="/atlas/concept/motor-driver">motor driver</Link> and{' '}
            <Link href="/atlas/concept/lipo-battery">LiPo battery</Link>.
          </li>
        </ol>

        <h2 id="limits">What this calculator leaves out</h2>
        <ul>
          <li>
            <strong>Traction.</strong> The calculator assumes the wheels grip. If the driven wheels carry only part of the
            weight, they may slip on a steep ramp before the motor runs out of torque.
          </li>
          <li>
            <strong>Uneven load sharing.</strong> It assumes every driven wheel does an equal share. On a cross-slope,
            while turning, or with one wheel on a different surface, one motor can do much more.
          </li>
          <li>
            <strong>The wheels’ and motors’ own rotating inertia</strong>, air drag, and bumps and door thresholds. Rotating
            inertia is small with low gear ratios, but a gearbox multiplies the motor rotor’s inertia by the ratio squared,
            so a high-ratio gearmotor can add a large share to the acceleration torque. A threshold can need more torque
            than a ramp; test it, or add margin.
          </li>
          <li>
            <strong>Arm poses other than horizontal</strong>, moving several joints at once, and gearbox losses and
            reflected rotor inertia in the joints (hobby servos use high gear ratios). Horizontal is the worst case for
            holding, so the numbers are safe for a slow arm; a fast arm moving several joints together needs a full
            dynamics model.
          </li>
        </ul>

        <h2 id="faq">Questions people ask</h2>
        {FAQ.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}

        <h2 id="related">Related</h2>
        <p>
          <Link href="/atlas/concept/torque">Torque</Link> · <Link href="/atlas/concept/dc-motor">DC motor</Link> ·{' '}
          <Link href="/atlas/concept/servo-motor">Servo motor</Link> · <Link href="/atlas/concept/stepper-motor">Stepper motor</Link> ·{' '}
          <Link href="/atlas/concept/gear-ratio">Gear ratio</Link> · <Link href="/visualizer/motor">Motor control simulator</Link>
        </p>

        <h2 id="sources">Sources</h2>
        <ol className="text-sm">
          {SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} rel="noopener" target="_blank">{s.title}</a>
            </li>
          ))}
        </ol>
        <p className="text-sm text-gray-400">
          Last checked {new Date(UPDATED).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} by{' '}
          <Link href="/about/how-this-is-written">R2BOT Editorial</Link>.
        </p>
      </article>

      <InlineSignup />
    </StaticPage>
  )
}
