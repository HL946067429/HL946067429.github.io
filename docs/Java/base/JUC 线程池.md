---
title: JUC 线程池
date: 2020-05-01 10:00:00
---

## JDK中自带的线程池
### newFixedThreadPool
::: tip newFixedThreadPool
固定线程数的线程池，线程是懒加载的，随着任务提交，才会创建线程，队列使用的是LinkedBlockingQueue(无界队列)
```java
public static ExecutorService newFixedThreadPool(int nThreads) {
    return new ThreadPoolExecutor(nThreads,nThreads
                                  0L,TimeUnit.MILLISECONDS,
                                  new LinkedBlockingQueue<Runnable>())
}
```
:::

### newSingleThreadExecutor
::: tip newSingleThreadExecutor
单例线程池，基于LinkedBlockingQueue实现
```java
public static ExecutorService newSingleThreadExecutor() {
    return new FinalizableDelegatedExecutorService(
                  new ThreadPoolExecutor(1,1,
                               0L,TimeUnit.MILLISECONDS,
                               new LinkedBlockingQueue<Runnable>()))
}
```
:::

### newCachedThreadPool
::: tip newCachedThreadPool
任务只要提交到当前线程池中，就必然有工作线程可以处理，基于SynchronousQueue实现（任务几乎是同时开始）
```java
public static ExecutorService newCachedThreadPool() {
    return new ThreadPoolExecutor(0,Integer.MAX_VALUE,
                                  60L,TimeUnit.SECONDS,
                                  new SynchronousQueue<Runnable>());
}
```
:::

### newScheduledThreadPool
::: tip newScheduledThreadPool
定时任务的线程池，基于DelayedWorkQueue实现，定时执行、延迟执行
```java
puiblic static ScheduledExecutorService newScheduledThreadPool(int corePoolSize) {
    super(corePoolSize, Integer.MAX_VALUE,
            0L,TimeUnit.NANOSECONDS,new DelayedWorkQueue());
}
```
:::

### newWorkStealingPool
::: tip newWorkStealingPool
基于ForkJoinPool实现
```java
public static ExecutorService newWorkStealingPool() {
    return new ForkJoinPool(Runtime.getRuntime().availableProcessors(),
                ForkJoinPool.defaultForkJoinWorkerThreadFactory,null,true);
}
```
:::


## 自定义线程池
### ThreadPoolExecutor
#### 重要属性
```java
// 记录工作线程数和线程池状态
// 高3为标识线程池的状态
// 低29位标识线程数
private final AtomicInteger ctl = new AtomicInteger(ctlOf(RUNNING, 0));
// Integer.SIZE = 32 
// COUNT_BITS = 29
private static final int COUNT_BITS = Integer.SIZE - 3;
// 00000000 00000000 00000000 00000001   1
// 00100000 00000000 00000000 00000000   1 << COUNT_BITS
// 00011111 11111111 11111111 11111111   (1 << COUNT_BITS) - 1
private static final int CAPACITY   = (1 << COUNT_BITS) - 1;

// runState is stored in the high-order bits
// 111 运行状态：只有这个状态才是正常状态
private static final int RUNNING    = -1 << COUNT_BITS;
// 000 SHUTDOWN：停止接收新任务，正在执行的任务继续，阻塞队列中的任务还是要执行
private static final int SHUTDOWN   =  0 << COUNT_BITS;
// 001 STOP：停止接收新任务，正在执行任务的线程将修改其中断标记位，阻塞队列中的任务不管
private static final int STOP       =  1 << COUNT_BITS;
// 010 TIDYING：过度状态，这个状态是SHUTDOWNHE和STOP状态转换过来的，代表当前线程池马上关闭，就是一个过渡状态
private static final int TIDYING    =  2 << COUNT_BITS;
// 011 TREMINATED：这个状态时TIDYING状态转换过来的，转换过来只需要执行一个terminated方法
private static final int TERMINATED =  3 << COUNT_BITS;

// 00011111 11111111 11111111 11111111    CAPACITY
// 11100000 00000000 00000000 00000000    ~CAPACITY
// 获取c的高3位
private static int runStateOf(int c)     { return c & ~CAPACITY; }
// 获取c的低29位
private static int workerCountOf(int c)  { return c & CAPACITY; }
//
private static int ctlOf(int rs, int wc) { return rs | wc; }
```
#### 线程池状态转换

<img class="zoom-custom-imgs" :src="$withBase('image/base/juc/img1.png')">

#### execute(Runnable command)方法
```java
public void execute(Runnable command) {
    // 传入的任务为空，抛异常
    if (command == null)
        throw new NullPointerException();
    // 获取ctl
    int c = ctl.get();
    //获取工作线程个数，判断是不是达到了核心线程数
    if (workerCountOf(c) < corePoolSize) {
        // 如果没有达到核心线程数据，直接加一个任务给核心线程，添加成功直接返回，失败继续
        if (addWorker(command, true))
            return;
        // 说明线程池状态发生变化或者工作线程个数发生变化了，再次获取ctl
        c = ctl.get();
    }
    // 查看当前线程池的状态是不是运行状态，是运行状态则将任务放入队列中
    if (isRunning(c) && workQueue.offer(command)) {
        // 放入成功，再次获取ctl
        int recheck = ctl.get();
        // 判断线程池是否是运行状态，如果不是，则移除刚刚放入队列中的任务
        if (! isRunning(recheck) && remove(command))
            // 移除成功，执行拒绝策略
            reject(command);
        // 线程池是运行状态，如果工作的线程数是0个，
        else if (workerCountOf(recheck) == 0)
            // 新增一个核心线程
            addWorker(null, false);
    }
    // 阻塞队列存放失败，可能是阻塞队列满了，就开启一个普通线程执行任务，添加成功则执行，失败则执行拒绝策略
    else if (!addWorker(command, false))
        reject(command);
}
```
#### addWorker(Runnable firstTask, boolean core)方法
> 添加一个工作线程执行任务，firstTask：任务；core：是否为核心线程
```java
private boolean addWorker(Runnable firstTask, boolean core) {
    // 校验线程池状态和工作线程数
    retry:
    for (;;) {
        // 获取ctl
        int c = ctl.get();
        // 获取线程池状态
        int rs = runStateOf(c);

        // Check if queue empty only if necessary.
        // 判断线程池状态是否正常
        if (rs >= SHUTDOWN // 只有-1是正常状态
            // 这三个判断都满足，说明需要添加一个非核心线程执行队列中的任务，
            // 只要有一个没满足，取反，就不需要添加
            && ! (rs == SHUTDOWN && firstTask == null && ! workQueue.isEmpty()) 
            )
            return false;
        // 判断工作线程数的循环
        for (;;) {
            // 获取工作线程数
            int wc = workerCountOf(c);
            // 工作线程数大于阈值或者 核心工作线程数大于核心线程数据 || 非核心大于最大线程数 
            if (wc >= CAPACITY ||
                wc >= (core ? corePoolSize : maximumPoolSize))
                // 不能再添加线程了
                return false;
            // CAS将工作线程数 + 1
            if (compareAndIncrementWorkerCount(c))
                // 添加成功跳出外层循环，执行后续逻辑
                break retry;
            // CAS失败，重新拿ctl
            c = ctl.get();  // Re-read ctl
            // 线程池状态不等于之前的状态，重新开始外层循环
            if (runStateOf(c) != rs)
                continue retry;
            // else CAS failed due to workerCount change; retry inner loop
        }
    }

    //添加工作线程，启动工作线程
    boolean workerStarted = false;
    boolean workerAdded = false;
    Worker w = null;
    try {
        // 创建一个工作线程
        w = new Worker(firstTask);
        // 获取工作线程中的线程对象
        final Thread t = w.thread;
        // 判断线程对象是否为空，为空说明我们给的线程工厂有问题
        if (t != null) {
            final ReentrantLock mainLock = this.mainLock;
            // 竞争锁
            mainLock.lock();
            try {
                // Recheck while holding lock.
                // Back out on ThreadFactory failure or if
                // shut down before lock acquired.
                //获取线程池状态
                int rs = runStateOf(ctl.get());
                // 如果线程池状态是正常的 
                // 或者线程池状态是SHUTDOWN，同时当前没有任务传过来(说明是启动一个工作线程执行队列中的任务)
                if (rs < SHUTDOWN ||
                    (rs == SHUTDOWN && firstTask == null)) {
                    // 如果线程是启动状态，直接抛异常(线程工厂创建一个线程后，不能开启，得让线程池开启)
                    if (t.isAlive()) // precheck that t is startable
                        throw new IllegalThreadStateException();
                    // 将工作线程添加到hashset中
                    workers.add(w);
                    // 拿到当前hashset的size
                    int s = workers.size();
                    // largestPoolSize记录最大hashset大小，
                    if (s > largestPoolSize)
                        largestPoolSize = s;
                    // 添加成功
                    workerAdded = true;
                }
            } finally {
                mainLock.unlock();
            }
            // 添加成功，启动线程
            if (workerAdded) {
                t.start();
                // 线程启动成功
                workerStarted = true;
            }
        }
    } finally {
        // 线程启动失败
        if (! workerStarted)
            // 补偿措施
            addWorkerFailed(w);
    }
    return workerStarted;
}


private void addWorkerFailed(Worker w) {
    final ReentrantLock mainLock = this.mainLock;
    // 获取锁
    mainLock.lock();
    try {
        // 工作线程不为空，则从hashset中移除
        if (w != null)
            workers.remove(w);
        // CAS修改ctl中工作线程数
        decrementWorkerCount();
        // 将线程池状态修改 -- TIDYING --- TERMINATED
        tryTerminate();
    } finally {
        mainLock.unlock();
    }
}


final void tryTerminate() {
    for (;;) {
        // 获取ctl
        int c = ctl.get();
        // 判断当前线程池的状态
        if (isRunning(c) ||  // 运行状态
            runStateAtLeast(c, TIDYING) ||    // 运行状态、shutdown、stop、tidying状态
            (runStateOf(c) == SHUTDOWN && ! workQueue.isEmpty())) // shutdown状态并且阻塞队列中不为空
            return; //返回
        if (workerCountOf(c) != 0) { // Eligible to terminate  工作线程数不为0 将HashSet中的工作线程设置线程中断标记
            interruptIdleWorkers(ONLY_ONE);
            return;
        }

        final ReentrantLock mainLock = this.mainLock;
        // 获取锁
        mainLock.lock();
        try {
            // 尝试CAS把线程状态修改为TIDYING状态
            if (ctl.compareAndSet(c, ctlOf(TIDYING, 0))) {
                //修改成功，再执行terminated
                try {
                    terminated();
                } finally {
                    // 将线程状态TERMINATED状态
                    ctl.set(ctlOf(TERMINATED, 0));
                    // 唤醒所有的阻塞
                    termination.signalAll();
                }
                return;
            }
        } finally {
            mainLock.unlock();
        }
        // else retry on failed CAS
    }
}
```

#### Worker类
> 线程池中封装的工作线程类
```java
private final class Worker extends AbstractQueuedSynchronizer implements Runnable {
    /**
     * This class will never be serialized, but we provide a
     * serialVersionUID to suppress a javac warning.
     */
    private static final long serialVersionUID = 6138294804551838833L;

    /** Thread this worker is running in.  Null if factory fails. */
    final Thread thread;
    // 初始化的时候带过来的任务
    Runnable firstTask;
    // 当前线程执行了多少个任务，和Pool中的completedTaskCount对应
    volatile long completedTasks;

    // 初始化，击继承AQS，初始化的时候，设置state为-1，不允许线程中断
    Worker(Runnable firstTask) {
        setState(-1); // inhibit interrupts until runWorker
        this.firstTask = firstTask;
        this.thread = getThreadFactory().newThread(this);
    }

    //start()之后调用run()
    public void run() {
        runWorker(this);
    }
}
```

#### runWorker(Worker w)
> 工作线程真正执行的方法
```java
final void runWorker(Worker w) {
    // 拿到当前线程
    Thread wt = Thread.currentThread();
    // 获取worker中的任务
    Runnable task = w.firstTask;
    w.firstTask = null;
    // 开始执行任务了，就释放锁，运行线程中断
    w.unlock(); // allow interrupts
    boolean completedAbruptly = true;
    try {
        // 如果worker中的任务不存在
        // 就从阻塞队列中获取任务
        while (task != null || (task = getTask()) != null) {
            // 执行任务加锁
            w.lock();
            // If pool is stopping, ensure thread is interrupted;
            // if not, ensure thread is not interrupted.  This
            // requires a recheck in second case to deal with
            // shutdownNow race while clearing interrupt
            // 判断当前线程池的状态，是不是STOP、TIDYING、TERMINATED等状态
            // 或者线程是中断的，并且线程池处于stoping状态，并且工作线程没有中断，
            // 则将工作线程中断
            if ((runStateAtLeast(ctl.get(), STOP) ||
                 (Thread.interrupted() && runStateAtLeast(ctl.get(), STOP))) &&
                !wt.isInterrupted())
                wt.interrupt();
            try {
                // 前置钩子函数
                beforeExecute(wt, task);
                Throwable thrown = null;
                try {
                    // 执行任务
                    task.run();
                } catch (RuntimeException x) {
                    thrown = x; throw x;
                } catch (Error x) {
                    thrown = x; throw x;
                } catch (Throwable x) {
                    thrown = x; throw new Error(x);
                } finally {
                    // 后置钩子函数
                    afterExecute(task, thrown);
                }
            } finally {
                // 执行完成，置空任务
                task = null;
                // 工作线程完成任务数++
                w.completedTasks++;
                //释放锁
                w.unlock();
            }
        }
        completedAbruptly = false;
    } finally {
        processWorkerExit(w, completedAbruptly);
    }
}

// 从阻塞队列中获取任务
private Runnable getTask() {
    boolean timedOut = false; // Did the last poll() time out?

    for (;;) {
        // 获取线程池状态
        int c = ctl.get();
        // 获取线程池状态
        int rs = runStateOf(c);

        // Check if queue empty only if necessary.
        // 如果线程池大于等于shutdown，并且队列是空的，
        // 或者线程池状态大于等于stop
        // 则不需要执行了，将工作线程数 - 1
        if (rs >= SHUTDOWN && (rs >= STOP || workQueue.isEmpty())) {
            decrementWorkerCount();
            return null;
        }
        // 获取工作线程数
        int wc = workerCountOf(c);

        // Are workers subject to culling?
        // 判断是否允许核心线程过期，或者当前线程数是否已经大于核心线程数
        boolean timed = allowCoreThreadTimeOut || wc > corePoolSize;
        // 工作线程数据大于最大线程数
        // 或者允许核心线程过期（当前线程数是否已经大于核心线程数）并且已经超时了（第一次进来不会超时）
        if ((wc > maximumPoolSize || (timed && timedOut))
            && (wc > 1 || workQueue.isEmpty())) { // 或者工作线程数大于1，或者阻塞队列中没有任务了
            // CAS修改工作线程数 - 1，然后直接返回
            if (compareAndDecrementWorkerCount(c))
                return null;
            continue;
        }

        try {
            // 需要超时，则使用poll超时获取，否则take获取
            Runnable r = timed ?
                workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS) :
                workQueue.take();
            if (r != null)
                return r;
            timedOut = true;
        } catch (InterruptedException retry) {
            timedOut = false;
        }
    }
}


// completedAbruptly：任务执行成功为：false，失败为true
private void processWorkerExit(Worker w, boolean completedAbruptly) {
    // 任务执行失败，需要
    if (completedAbruptly) // If abrupt, then workerCount wasn't adjusted
        decrementWorkerCount();

    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        // 汇总完成任务总数
        completedTaskCount += w.completedTasks;
        // 从HashSet中移除worker
        workers.remove(w);
    } finally {
        mainLock.unlock();
    }
    // 尝试关闭线程池
    tryTerminate();
    // 获取线程池状态
    int c = ctl.get();
    //如果线程池状态处于 running、shutdown状态
    if (runStateLessThan(c, STOP)) {
        // 任务执行成功
        if (!completedAbruptly) {
            // 判断一下是否允许核心线程过期，
            int min = allowCoreThreadTimeOut ? 0 : corePoolSize;
            // 队列中还有任务，但是工作线程为0
            if (min == 0 && ! workQueue.isEmpty())
                min = 1;
            // 工作线程还有，直接返回
            if (workerCountOf(c) >= min)
                return; // replacement not needed
        }
        // 工作线程没有了，但是阻塞队列中还存在任务，此时要开启一个非核心线程去执行任务
        addWorker(null, false);
    }
}
```
#### setCorePoolSize(int corePoolSize)
> 动态修改线程池的核心线程数
```java
public void setCorePoolSize(int corePoolSize) {
    if (corePoolSize < 0 || maximumPoolSize < corePoolSize)
        throw new IllegalArgumentException();
    int delta = corePoolSize - this.corePoolSize;
    this.corePoolSize = corePoolSize;
    if (workerCountOf(ctl.get()) > corePoolSize)
        interruptIdleWorkers();
    else if (delta > 0) {
        // We don't really know how many new threads are "needed".
        // As a heuristic, prestart enough new workers (up to new
        // core size) to handle the current number of tasks in
        // queue, but stop if queue becomes empty while doing so.
        int k = Math.min(delta, workQueue.size());
        while (k-- > 0 && addWorker(null, true)) {
            if (workQueue.isEmpty())
                break;
        }
    }
}
```
<img class="zoom-custom-imgs" :src="$withBase('image/base/juc/img2.png')">


