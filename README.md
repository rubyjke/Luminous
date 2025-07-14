# Luminous 
A mini drone for light painting. Design your light path at https://luminous-azure.vercel.app/, set up your camera, and let the drone do the rest. 
![](https://hc-cdn.hel1.your-objectstorage.com/s/v3/70b0d1db7289c978004c9860e64a17e661531093_img_8569.jpg)
![](https://hc-cdn.hel1.your-objectstorage.com/s/v3/c49f2110937be9f2f97de7602ea717568374698c_image.png)

### What's light painting?
Light painting is a photographic technique that uses a moving light source (our drone) to *paint* over a scene while taking a long exposure photograph. A few couple of the photo effect this produces:
![Image of a woman in a navy dress with yellow and white light painted arches](https://sublument.com/images/l/i/g/h/t/light-painting-cristina-1515-102010df.jpg)
![Light painted dinosaur skeleton](https://64.media.tumblr.com/b159b70de17b5e26f704a4883638f06e/tumblr_inline_nqem1ixdLq1ss29o0_1280.jpg)

### Why did we make Luminous?
Light painting can be tricky, especially when you're doing it alone. You need to finish the *painting* in a set amount of time it can take quite a few takes to get the exact result you want. We wanted to find a way to address this and realized that an autnomous phone paired with path design software could allow for custom light paths to be made and executed effortlessly.
The project also combined our hobbies: art, photogrphy, and drone design. 

### BOM
|MicoAir MTF-02P Optical Flow & 6m Range Lidar|
|BetaFPV Lava 3S 450 mAh 75C XT30 LiPO (2Pcs)|
|Happymodel Mobula Frame Kit|
|Gemfan 5-Blade D51-5 Cinewhoop Prop (4CW & 4CCW)- T-Mount|
|VCI Spark 1104 7100KV Motor (2Pcs)|
|SpeedyBee F405 Mini 20x20 Flight Controller|
---
**Disclaimer**
We fried our sensor so *our* drone can't map the path autonomously, however we're pretty confident that if you build a replica with a working sensor that it'll work just fine!
---
# Journal 
**Hardware:**
A simple tinywhoop electronic stack without the FPV system. So FC, ESC, reciever, transmitter, batteries and an additional optical flow/LiDAR 2-in-1 sensor.
The optical flow sensor is to allow the drone to track its position and maintain its height in indoor settings. We need it in this project to fly autonomously indoors to create the light paintings.

**Software:**
Part 1: Ardupilot Configuration
This is the trickiest part of the entire project by far. Theres a lot of configuration options in this firmware and its hard to get all the sensors working. The biggest thing to note is for the optical flow sensor, you have to have it using MAVLink and correctly set it to use the MAV_apm protocol. Also go through normal ardupilot setup of course, with motors, receiver, ESC, etc.
Part 2: Luminous software
We created a custom flight map generator where you can draw the pattern you want to see, and it automatically generates the flight path for the drone which you can then upload to draw your painting. It converts your drawing into waypoints for the Ardupilot software to use and scales it according to your surroundings. We used react + nextjs for the website and used some ardupilot python scripts to generate the flightpaths.

Biggest struggle early on was getting things soldered, which was something we were new to. We eventually got the hang of it but our next problem was a fried OpticalFlow sensor. We accidentally soldered to a 9V pad, instead of a 5V one, causing the sensor to smoke up. This resulted in the sensor being cooked and us not being to run autonomous flight on the drone anymore. So now we're stuck drawing the paths manually.
