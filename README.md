# shumai-profiler

An interactive profiler for [shumai](https://github.com/facebookresearch/shumai).
Supports local and distributed workloads.

![Preview](./docs/preview.gif)


## Use cases

* Insights into hardware utilization
* Understand where time is being spent
* Contrast hosts & devices
* Insights into the types of operations and their impact


## Usage

[Node.js](https://nodejs.org/en/) required. Support for [Bun](https://bun.sh/) coming.

Run the profiler:

```bash
npx shumai-profiler --host
# OR npm i shumai-profiler -g && shumaip --host
```

Update your [shumai](https://github.com/facebookresearch/shumai) app
to point to profiler:

```javascript
import * as sm from '@shumai/shumai';

sm.stats.enabled = true
sm.stats.logger = new sm.StatsLoggerHttp({ url: 'http://localhost:3000/logger' })
```

Run your application.

You're all set, open your browser to [http://localhost:3000/](http://localhost:3000/)
and give the profiler 10 seconds or so to fill in the graphs. You can
expect to see a ~10 second lag between your application and the graphs.
