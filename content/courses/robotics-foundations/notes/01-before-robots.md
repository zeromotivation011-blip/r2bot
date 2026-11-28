---
updated: 2026-11-28
reviewed: 2026-11-28
---

## The idea in one sentence

About two thousand years ago, an engineer in Alexandria described temple doors that opened by themselves when a fire was lit on an altar. They show one of the oldest ideas in robotics: a machine that does a job without a person controlling every step.

## The doors that opened themselves

Hero of Alexandria was an engineer and teacher who probably lived in the first century CE, in Roman Egypt (the exact date is uncertain). His book *Pneumatics* describes dozens of machines driven by air, water and heat. One of them, section 37 in the 1851 English translation, is titled "Temple Doors opened by Fire on an Altar".

In Hero's description, lighting a fire on the altar of a small temple made its doors swing open after a while. When the fire died down, they closed again. Nobody pushed them, and to anyone who could not see the works underneath, it would have looked like magic. Nobody knows whether it was ever built at full size.

Here is what was hidden underneath, step by step:

1. **The fire heats the air** inside the hollow altar.
2. **Warm air pushes harder.** The altar connects by a pipe to a closed globe that is partly full of water, so the pressure rises in the globe too.
3. **The pressure pushes water out** of the globe through a bent pipe (a siphon) into a hanging bucket.
4. **The bucket gets heavier and sinks.** Chains run from the bucket, over a pulley, and wrap around the posts the doors turn on. As the bucket falls, the chains turn the posts and the doors open.
5. **The fire goes out, so everything runs backwards.** The air cools, the pressure drops, the water flows back into the globe, the bucket gets lighter, and a lead weight on chains wound the other way pulls the doors shut.

Section 38 of the same book gives a second version that uses a leather bag instead of a globe of water. Normally a weight holds the doors shut. The hot air inflates the bag, the bag lifts that weight, and the doors swing open (Hero suggests a counterweight to pull them). When the fire dies, the bag empties, the weight drops and the doors close.

## What makes a machine act on its own

Take away the temple and the priests, and the door has three parts that every self-acting machine still has:

| Part | In Hero's door | In a robot vacuum today |
|---|---|---|
| **A trigger**: something that starts it | The fire on the altar | A button, a schedule, or a sensor reading |
| **A source of energy** | Heat from the fire | A battery |
| **A mechanism** that turns energy into movement | Air pressure, water, a bucket, chains | Electric motors, wheels, brushes |

Notice what is *not* on the list: a face, arms, or anything that looks like a person. Many of the most useful robots look nothing like us. What matters is that the machine does the job once it is started.

## What Hero's door could not do

The door is not a robot, and the reason is useful. It runs the same way every time. It cannot notice that someone is standing in the doorway, and it cannot decide to wait. Engineers call this **open-loop** behaviour: the machine acts, but it never checks the result and corrects itself.

A robot adds the missing pieces. It **senses** the world, **thinks** (chooses what to do from what it sensed) and **acts**. That loop is the subject of the rest of this course.

The ancient world already had one piece of that loop. Ktesibios, an engineer in Alexandria around 250 BCE, improved the water clock with a float that kept the water at a steady level. A steady level meant water dripped through at a steady rate, so the clock kept accurate time without anyone tending it. A float that measures a level and adjusts the flow is an early example of **feedback**: the machine checks its own result and corrects it. Feedback is what lets a modern robot arm hold its position or a drone stay level in the wind.

## Going further

If you know a little physics, the door is a nice puzzle.

- **Why does heat open it?** Air trapped in a closed space pushes harder as it warms. For a fixed amount of gas in a fixed volume, pressure rises in proportion to absolute temperature. Warming air from 20 °C (293 K) to 100 °C (373 K) raises its pressure by about 27%, roughly 27 kPa above normal air pressure, which in principle could lift water more than two metres. That is plenty to push water up a short pipe. (This is an idealisation: in the real device the air also expands into the globe.)
- **Why is it slow?** The altar, the air and the water all take time to warm up, so the doors would open gradually, not with a snap. Engineers still have to model this kind of delay. A heater, a motor or a robot joint never responds instantly.
- **Why does it reset itself?** The counterweight stores the job of closing. A related trick appears in many robot arms today, where springs or weights carry part of the load so the motors can be smaller.
- **Open-loop or closed-loop?** The door is open-loop: nothing measures the door's position. Ask yourself what you would add so it stops halfway if someone is in the way. That question is how robotics thinks.

## Try it

- See the sense–think–act loop running, one stage at a time: [Sense–Think–Act simulator](/visualizer/sense-think-act).
- Read more in the Atlas: [open-loop control](/atlas/concept/open-loop-control), [feedback loop](/atlas/concept/feedback-loop), [actuator](/atlas/concept/actuator), and where the word "robot" comes from: [Karel Čapek](/atlas/person/karel-capek).

## Sources

1. Hero of Alexandria, *The Pneumatics of Hero of Alexandria*, translated by J. G. Greenwood for, and edited by, Bennet Woodcroft (London: Taylor Walton and Maberly, 1851), sections 37 and 38. [Project Gutenberg edition](https://gutenberg.org/ebooks/77400).
2. A. C. Sparavigna, "Water, air and fire at work in Hero's machines", Politecnico di Torino, [arXiv:1101.3470](https://arxiv.org/abs/1101.3470).
3. W. B. Ashworth Jr., "Hero of Alexandria", Scientist of the Day, [Linda Hall Library](https://www.lindahall.org/about/news/scientist-of-the-day/hero-of-alexandria/), 2025.
4. "Ctesibius Builds the First Truly Automatic Self-Regulatory Device", [HistoryofInformation.com](https://www.historyofinformation.com/detail.php?id=1946), citing L. Nocks, *The Robot: The Life Story of a Technology* (2008), pp. 12–13.
