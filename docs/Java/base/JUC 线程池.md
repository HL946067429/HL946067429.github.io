---
title: JUC 线程池
date: 2020-05-01 10:00:00
---

## 基本概述
::: tip 
线程池：一个容纳多个线程的容器，容器中的线程可以重复使用，省去了频繁创建和销毁对象的操作
线程池的作用：
* 降低资源消耗，减少了创建和销毁的次数，每个工作线程都可以被重复利用，可执行多个任务
* 提高相应速度，当任务达到时，如果有线程可以直接用，不会出现系统僵死
* 提高线程的可管理性，如果无限制的创建线程，不仅会消耗系统资源，还会降低系统的稳定性，使用线程池可以进行统一的分配，调优和监控
  
线程池的核心思想：**线程复用**，同一个线程可以被重复使用，来处理多个任务。<br/>
池化技术(Pool)：一种编程技巧，核心思想是资源复用，在请求量大时能优化应用性能，降低系统频繁建立的资源开销
:::

## 阻塞队列
### 基本介绍
> 有界队列和无界队列：
> * 有界队列：有固定大小的队列，比如设定了固定大小的队列，或者大小为0
> * 无界队列：没有设置固定大小的队列，这些队列可以直接入队，直到溢出（超过 Integer.MAX_VALUE），所以相当于无界

`java.util.concurrent.BlockingQueue` 接口有以下阻塞队列的实现：**FIFO 队列**
* ArrayBlockQueue：由数组结构组成的有界阻塞队列
* LinkedBlockingQueue：由链表结构组成的无界（默认大小 Integer.MAX_VALUE）的阻塞队列
* PriorityBlockQueue：支持优先级排序的无界阻塞队列
* DelayedWorkQueue：使用优先级队列实现的延迟无界阻塞队列
* SynchronousQueue：不存储元素的阻塞队列，每一个生产线程会阻塞到有一个 put 的线程放入元素为止
* LinkedTransferQueue：由链表结构组成的无界阻塞队列
* LinkedBlockingDeque：由链表结构组成的双向阻塞队列

### 生产者存储方法
| 方法 | 描述 |
| --- | --- |
|add(E)|添加数据到队列，如果队列满了，无法储存，抛出异常|
|offer(E)|添加数据到队列，如果满了，返回false|
|offer(E,timeout,unit)|添加数据发哦队列，如果满了，阻塞timeout时间，如果阻塞一段时间，依然没添加进去，返回false|
|put(E)|添加数据到队列，如果队列满了，挂起线程，等到队列中有位置，再扔数据进去，死等|

### 消费者取数据方法
| 方法 | 描述                                        |
| -- |-------------------------------------------|
|remove()| 从队列中移除数据，如果队列为空，抛出异常                      |
|poll()| 从队列中移除数据，如果队列为空，返回null                    |
|poll(timeout,unit)| 从队列中移除数据，如果队列为空，挂起线程timeout时间，等生产者扔数据，再获取 |
|take()| 从队列中移除数据，如果队列为空，线程挂起，一直等到生产者扔数据，再获取。死等    |


### ArrayBlockingQueue
> 由数组结构组成的有界阻塞队列
#### 重要属性
```java
/** 存放元素的数组 */
final Object[] items;

/** 下次从队列中取元素的下标 */
int takeIndex;

/** 下次往队列中存元素的下标 */
int putIndex;

/** 队列中的元素数 */
int count;

/*
 * Concurrency control uses the classic two-condition algorithm
 * found in any textbook.
 */

/** 锁 */
final ReentrantLock lock;

/** 取元素的时候，如果队列为空，并且使用的是等待式取，则通过这个Condition进行等待*/
private final Condition notEmpty;

/** 队列已经满了，通过可等待式的放入队列，则通过这个Condition进行等待 */
private final Condition notFull;
```

#### add(E)方法
> 添加数据到队列，如果队列满了，无法储存，抛出异常
```java
// 通过调用父类`AbstractQueue`的`add(E e)`方法
public boolean add(E e) {
    return super.add(e);
}
// 父类的add方法调用的是offer方法
public boolean add(E e) {
    if (offer(e))
        return true;
    else
        throw new IllegalStateException("Queue full");
}
```
#### offer(E)方法
> 添加数据到队列，如果满了，返回false
```java
public boolean offer(E e) {
    // 为空校验
    Objects.requireNonNull(e);
    // 获取锁
    final ReentrantLock lock = this.lock;
    // 加锁
    lock.lock();
    try {
        // 队列是否已经满了，如果满了，直接返回false
        if (count == items.length)
            return false;
        else {
            // 没满，则将新的元素加入到数组
            enqueue(e);
            return true;
        }
    } finally {
        // 释放锁
        lock.unlock();
    }
}

private void enqueue(E e) {
    // assert lock.isHeldByCurrentThread();
    // assert lock.getHoldCount() == 1;
    // assert items[putIndex] == null;
    // 获取当前存储元素的数组
    final Object[] items = this.items;
    // 将元素放入数组
    items[putIndex] = e;
    // 更新putIndex 如果putIndex等于数组长度，则置为0（下一次存放的位置）
    if (++putIndex == items.length) putIndex = 0;
    // 更新元素数量
    count++;
    // 唤醒其他线程
    notEmpty.signal();
}
```

#### offer(E,timeout,unit)方法
> 添加数据发哦队列，如果满了，阻塞timeout时间，如果阻塞一段时间，依然没添加进去，返回false
```java
public boolean offer(E e, long timeout, TimeUnit unit)
    throws InterruptedException {

    Objects.requireNonNull(e);
    // 将timeout转换为纳秒
    long nanos = unit.toNanos(timeout);
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    try {
        // 队列满了，则等待timeout时间后再判断，直到超时
        while (count == items.length) {
            if (nanos <= 0L)
                return false;
            nanos = notFull.awaitNanos(nanos);
        }
        enqueue(e);
        return true;
    } finally {
        lock.unlock();
    }
}
```
#### put(E)方法
> 添加数据到队列，如果队列满了，挂起线程，等到队列中有位置，再扔数据进去，死等
```java
public void put(E e) throws InterruptedException {
    Objects.requireNonNull(e);
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    try {
        // 死等
        while (count == items.length)
            notFull.await();
        enqueue(e);
    } finally {
        lock.unlock();
    }
}
```

#### remove()方法
> 从队列中移除数据，如果队列为空，抛出异常
```java
public E remove() {
    E x = poll();
    if (x != null)
        return x;
    else
        throw new NoSuchElementException();
}
```
#### poll()方法
> 从队列中移除数据，如果队列为空，返回null
```java
public E poll() {
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        // 如果队列为空，则返回null, 否则从队列中取数据
        return (count == 0) ? null : dequeue();
    } finally {
        lock.unlock();
    }
}

private E dequeue() {
    // assert lock.isHeldByCurrentThread();
    // assert lock.getHoldCount() == 1;
    // assert items[takeIndex] != null;
    // 获取当前存储元素的数组
    final Object[] items = this.items;
    @SuppressWarnings("unchecked")
    // 拿到当前出队列的数据
    E e = (E) items[takeIndex];
    // 将当前位置的数据置为null
    items[takeIndex] = null;
    // 更新当前出队列的位置，如果当前位置等于数组长度，则置为0
    if (++takeIndex == items.length) takeIndex = 0;
    // 更新队列中元素的数量
    count--;
    // itrs不等于null，则需要判断队列是不是为空了，为空需要将迭代器中的元素置空
    if (itrs != null)
        itrs.elementDequeued();
    // 唤醒其他线程
    notFull.signal();
    return e;
}
```

#### poll(timeout,unit)方法
> 从队列中移除数据，如果队列为空，阻塞timeout时间，如果阻塞一段时间，依然没移除，返回null
```java
public E poll(long timeout, TimeUnit unit) throws InterruptedException {
    long nanos = unit.toNanos(timeout);
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    try {
        // 如果没有元素，则等待timeout时间，直到超时
        while (count == 0) {
            if (nanos <= 0L)
                return null;
            nanos = notEmpty.awaitNanos(nanos);
        }
        return dequeue();
    } finally {
        lock.unlock();
    }
}
```

#### take()方法
> 从队列中移除数据，如果队列为空，挂起线程，等到队列中有位置，再扔数据进去，死等
```java
public E take() throws InterruptedException {
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    try {
        while (count == 0)
            notEmpty.await();
        return dequeue();
    } finally {
        lock.unlock();
    }
}
```

### LinkedBlockingQueue
> 由链表结构组成的无界（默认大小 Integer.MAX_VALUE）的阻塞队列

#### 重要属性
```java
// 队列容量，默认Integer.MAX_VALUE，再构造函数中设置
private final int capacity;  
// 存的数据的count，
private final AtomicInteger count = new AtomicInteger();
// 头节点 取数据
transient Node<E> head;
// 尾节点 存数据
private transient Node<E> last;
// 消费者锁
private final ReentrantLock takeLock = new ReentrantLock();

// 消费者的阻塞和唤醒
private final Condition notEmpty = takeLock.newCondition();

// 生产者锁
private final ReentrantLock putLock = new ReentrantLock();

// 生产者的阻塞和唤醒
private final Condition notFull = putLock.newCondition();
```

#### add(E)方法
> 调用offer方法， 存成功返回true， 失败抛异常
```java
public boolean add(E e) {
    if (offer(e))
        return true;
    else
        throw new IllegalStateException("Queue full");
}
```

#### offer(E)方法
> 加put锁，然后判断有没有超限，没有超限，入队列，然后再判断有没有超限，没有唤醒生产者,如果是第一个元素入队，唤醒消费者
```java
public boolean offer(E e) {
    // 为空校验
    if (e == null) throw new NullPointerException();
    // 当前队列中的数据count
    final AtomicInteger count = this.count;
    // 如果count等于队列的容量限制了，直接返回false，不能再添加了
    if (count.get() == capacity)
        return false;
    int c = -1;
    // 将数据封装成Node
    Node<E> node = new Node<E>(e);
    // 获得写锁
    final ReentrantLock putLock = this.putLock;
    // 竞争锁
    putLock.lock();
    try {
        // 竞争锁成功后，再判断是否超过限制
        if (count.get() < capacity) {
            // 没有超过，将node加入队列
            enqueue(node);
            //将当前的count + 1，同时将 + 1之前的count赋值给c
            c = count.getAndIncrement();
            // 当前数据存成功后，还是小于队列容量，唤醒再排队的生产者，offer带时间的，put这两种方式都会阻塞，
            if (c + 1 < capacity)
                notFull.signal();
        }
    } finally {
        // 释放锁
        putLock.unlock();
    }
    // 如果之前的count等于0，说明之前队列是空的，如果有消费者来消费，消费者将会阻塞，此时已经成功添加数据了，唤醒阻塞的消费者
    if (c == 0)
        signalNotEmpty();
    return c >= 0;
}

//元素入队列
private void enqueue(Node<E> node) {
    // 将last的后继指向当前Node，然后移动last指向Node
    last = last.next = node;
}

private void signalNotEmpty() {
    // 获取读锁
    final ReentrantLock takeLock = this.takeLock;
    takeLock.lock();
    try {
        // 唤醒消费者
        notEmpty.signal();
    } finally {
        takeLock.unlock();
    }
}
```

#### offer(E,timeout,unit)
> 加put锁，然后判断有没有超限，<br>
>   * 超限了，等待指定时间，唤醒后继续判断有没有超限，或者时间到了<br>
>   * 没有超限，入队列，然后再判断有没有超限，没有唤醒生产者<br>
> 如果是第一个元素入队，唤醒消费者

```java
public boolean offer(E e, long timeout, TimeUnit unit)
    throws InterruptedException {
    // 非空校验
    if (e == null) throw new NullPointerException();
    // 转换时间为纳秒
    long nanos = unit.toNanos(timeout);
    int c = -1;
    final ReentrantLock putLock = this.putLock;
    final AtomicInteger count = this.count;
    // 获取put锁，和当前queue的count
    putLock.lockInterruptibly();
    try {
        //加锁成功，判断有没有超限
        while (count.get() == capacity) {
            // 如果等待时间到了，直接返回false，添加失败
            if (nanos <= 0)
                return false;
            // 超限就等待,awaitNanos挂起线程，指定时间后会被唤醒，并且返回剩余时间
            nanos = notFull.awaitNanos(nanos);
        }
        //入队列
        enqueue(new Node<E>(e));
        c = count.getAndIncrement();
        if (c + 1 < capacity)
            notFull.signal();
    } finally {
        putLock.unlock();
    }
    if (c == 0)
        signalNotEmpty();
    return true;
}
```

#### put(E)方法
> 加put锁，然后判断有没有超限，
>   * 超限了，死等
>   * 没有超限，入队列，然后再判断有没有超限，没有唤醒生产者<br>
> 如果是第一个元素入队，唤醒消费者
```java
public void put(E e) throws InterruptedException {
    
    if (e == null) throw new NullPointerException();
    int c = -1;
    Node<E> node = new Node<E>(e);
    final ReentrantLock putLock = this.putLock;
    final AtomicInteger count = this.count;
    
    putLock.lockInterruptibly();
    try {
        while (count.get() == capacity) {
            notFull.await();
        }
        enqueue(node);
        c = count.getAndIncrement();
        if (c + 1 < capacity)
            notFull.signal();
    } finally {
        putLock.unlock();
    }
    if (c == 0)
        signalNotEmpty();
}
```

#### remove()方法
> 调用poll()方法，存在数据返回数据，不存在抛异常
```java
public E remove() {
    E x = poll();
    if (x != null)
        return x;
    else
        throw new NoSuchElementException();
}
```

#### poll()方法
> 先判断数量是否为空，为空直接返回null<br>
> 再获取锁，然后再次判断是否存在数据，存在则利用head获取数据，然后判断剩余数据，存在则唤醒其他消费者<br>
> 释放锁，<br>
> 最后判断队列还有没有空位，存在则唤醒生产者
```java
public E poll() {
    // 获取当前队列中的数量
    final AtomicInteger count = this.count;
    //数量为空，直接返回null
    if (count.get() == 0)
        return null;
    E x = null;
    int c = -1;
    // 获取读锁
    final ReentrantLock takeLock = this.takeLock;
    takeLock.lock();
    try {
        // 再次判断是否存在数据
        if (count.get() > 0) {
            //存在数据。则取出
            x = dequeue();
            //count--
            c = count.getAndDecrement();
            //如果取数据之前的count > 1,唤醒再排队的消费者
            if (c > 1)
                notEmpty.signal();
        }
    } finally {
        takeLock.unlock();
    }
    //如果存之前的count == 队列的限制，现在消费了一个数据，有空位了，唤醒生产者继续存数据
    if (c == capacity)
        signalNotFull();
    return x;
}

private E dequeue() {
    //拿到头节点
    Node<E> h = head;
    // 头节点的后继
    Node<E> first = h.next;
    // 移动h，相当于释放head
    h.next = h; // help GC
    // 然后让head指向原来头节点的后继
    head = first;
    // 拿出数据
    E x = first.item;
    // 清空数据
    first.item = null;
    //返回数据
    return x;
}

private void signalNotFull() {
    final ReentrantLock putLock = this.putLock;
    putLock.lock();
    try {
        notFull.signal();
    } finally {
        putLock.unlock();
    }
}
```
#### poll(timeout,unit)
> 流程和poll()方法差不多，区别在于通过while循环判断是否存在数据，不存在则线程等待timeout，如果还是没有返回null
```java
public E poll(long timeout, TimeUnit unit) throws InterruptedException {
    E x = null;
    int c = -1;
    long nanos = unit.toNanos(timeout);
    final AtomicInteger count = this.count;
    final ReentrantLock takeLock = this.takeLock;
    takeLock.lockInterruptibly();
    try {
        while (count.get() == 0) {
            if (nanos <= 0)
                return null;
            nanos = notEmpty.awaitNanos(nanos);
        }
        x = dequeue();
        c = count.getAndDecrement();
        if (c > 1)
            notEmpty.signal();
    } finally {
        takeLock.unlock();
    }
    if (c == capacity)
        signalNotFull();
    return x;
}
```

#### take()方法
> 流程和poll(timeout,unit)差不多，这里是死等，没有超时
```java
public E take() throws InterruptedException {
    E x;
    int c = -1;
    final AtomicInteger count = this.count;
    final ReentrantLock takeLock = this.takeLock;
    takeLock.lockInterruptibly();
    try {
        while (count.get() == 0) {
            notEmpty.await();
        }
        x = dequeue();
        c = count.getAndDecrement();
        if (c > 1)
            notEmpty.signal();
    } finally {
        takeLock.unlock();
    }
    if (c == capacity)
        signalNotFull();
    return x;
}
```
### PriorityBlockingQueue：优先级队列
> 支持优先级排序的无界阻塞队列，优先级队列基于数组实现，采用了二叉堆思想(小顶堆：左右子节点大于父节点)
#### 重要属性
```java
// 数组的默认长度
private static final int DEFAULT_INITIAL_CAPACITY = 11;
// 最大长度 适配不同的虚拟机 -8
private static final int MAX_ARRAY_SIZE = Integer.MAX_VALUE - 8;
// 存放数据的数组
private transient Object[] queue;
// 数组存放的个数
private transient int size;
// 比较器
private transient Comparator<? super E> comparator;
// 锁
private final ReentrantLock lock;
// 等待唤醒
private final Condition notEmpty;
// 是否正在扩容的标志
private transient volatile int allocationSpinLock;
```

#### offer()方法
> 先判断是否需要扩容，需要则扩容
> 扩容逻辑完成之后，通过比较器进行比较，然后通过siftUp方法进行上移操作
```java
public boolean offer(E e) {
    // 为空判断
    if (e == null)
        throw new NullPointerException();
    final ReentrantLock lock = this.lock;
    // 加锁
    lock.lock();
    int n, cap;
    Object[] array;
    // n：当前数组中的count
    // array：数组
    // cap：数组长度
    // 当前数组中的count >= 数组长度时，需要进行扩容操作
    while ((n = size) >= (cap = (array = queue).length))
        // 扩容方法
        tryGrow(array, cap);
    try {
        //拿到比较器
        Comparator<? super E> cmp = comparator;
        // 如果没有自定义比较器，则使用默认比较器
        if (cmp == null)
            // 添加数据，同时平衡二叉堆
            siftUpComparable(n, e, array);
        else
            siftUpUsingComparator(n, e, array, cmp);
        // 数组长度 + 1
        size = n + 1;
        // 唤醒消费者
        notEmpty.signal();
    } finally {
        lock.unlock();
    }
    return true;
}


private void tryGrow(Object[] array, int oldCap) {
    // 释放锁
    lock.unlock(); // must release and then re-acquire main lock
    Object[] newArray = null;
    // 如果扩容标识等于0，然后CAS修改标识
    if (allocationSpinLock == 0 &&
        UNSAFE.compareAndSwapInt(this, allocationSpinLockOffset,
                                 0, 1)) {
        try {
            // 计算新长度，如果原来的长度小于64，则新长度等于原来长度 + 2，否则等于原来长度2倍
            int newCap = oldCap + ((oldCap < 64) ?
                                   (oldCap + 2) : // grow faster if small
                                   (oldCap >> 1));
            // 判断新长度是否超过最大长度
            if (newCap - MAX_ARRAY_SIZE > 0) {    // possible overflow
                int minCap = oldCap + 1;
                // 如果原来长度 + 1是负数，或者大于最大限度，直接oom
                if (minCap < 0 || minCap > MAX_ARRAY_SIZE)
                    throw new OutOfMemoryError();
                // 否则新长度等于最大长度
                newCap = MAX_ARRAY_SIZE;
            }
            // 新长度大于原来长度 并且数组还没边
            if (newCap > oldCap && queue == array)
                // 则创建新数组
                newArray = new Object[newCap];
        } finally {
            // 修改扩容标识为0
            allocationSpinLock = 0;
        }
    }
    // 如果新数组为null，说明其他线程进入扩容方法了，但是没有进入到扩容逻辑，此时交出调度
    if (newArray == null) // back off if another thread is allocating
        Thread.yield();
    // 竞争锁
    lock.lock();
    // 竞争锁成功，继续判断新数组不为空，同时数组还是没有变化
    if (newArray != null && queue == array) {
        // 则将新数组赋值给queue对象，实现扩容操作
        queue = newArray;
        // 将旧数组的数据copy到新数组上
        System.arraycopy(array, 0, newArray, 0, oldCap);
    }
}
// k：数据的个数(需要添加位置的下标) x：添加的元素 array：数组
// 每次和父节点对比，如果父节点大于当前数据，父节点下移，继续向上对比
private static <T> void siftUpComparable(int k, T x, Object[] array) {
    Comparable<? super T> key = (Comparable<? super T>) x;
    // 数组中存在数据才需要平衡二叉堆
    while (k > 0) {
        // 拿到当前下标的上级下标 (k-1) / 2
        int parent = (k - 1) >>> 1;
        // 拿到上级的数据
        Object e = array[parent];
        // 比较 如果添加的数据大于等于上级的数据 跳出循环，(说明需要添加的数据的位置就是k下标处)
        if (key.compareTo((T) e) >= 0)
            break;
        // 如果小于，则交换，将原来的父节点的值放到k的位置，然后继续向上，处理
        array[k] = e;
        // 将k赋值为父节点所在的下标，然后又进入循环
        k = parent;
    }
    // 将数据插入到k下标的位置
    array[k] = key;
}
```
#### add()方法
```java
public boolean add(E e) {
    return offer(e);
}
```
#### offer(timeout,unit)方法
```java
public boolean offer(E e, long timeout, TimeUnit unit) {
    return offer(e); // never need to block
}
```
#### put()方法
```java
public void put(E e) {
    offer(e); // never need to block
}
```

#### remove()方法
```java
public E remove() {
    E x = poll();
    if (x != null)
        return x;
    else
        throw new NoSuchElementException();
}
```

#### poll()方法
```java
public E poll() {
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        return dequeue();
    } finally {
        lock.unlock();
    }
}

private E dequeue() {
    int n = size - 1;
    // 数组中没有数据
    if (n < 0)
        return null;
    else {
        Object[] array = queue;
        // 拿到下标为0的数据
        E result = (E) array[0];
        // 拿到最大下标的数据
        E x = (E) array[n];
        array[n] = null;
        Comparator<? super E> cmp = comparator;
        if (cmp == null)
            siftDownComparable(0, x, array, n);
        else
            siftDownUsingComparator(0, x, array, n, cmp);
        size = n;
        //返回下标为0的数据
        return result;
    }
}
// k：0  x：下标最大的数据  n：最大的下标
private static <T> void siftDownComparable(int k, T x, Object[] array,
                                           int n) {
    // 存在数据                                       
    if (n > 0) {
        Comparable<? super T> key = (Comparable<? super T>)x;
        // 因为二叉堆的原因，只需要处理一半的数据
        // half：n / 2
        int half = n >>> 1;           // loop while a non-leaf
        while (k < half) {
            // 左子节点的下标
            int child = (k << 1) + 1; // assume left child is least
            // 左子节点
            Object c = array[child];
            // 右子节点的下标
            int right = child + 1;
            // 如果右子节点大于n(说明不存在)
            // 右子节点小于n 并且左子节点大于右子节点
            if (right < n &&
                ((Comparable<? super T>) c).compareTo((T) array[right]) > 0)
                //即 c取左右子节点中较小的
                c = array[child = right];
            // 如果最大下标的数小于等于当前左右子节点的较小的，那么最大下标的数据应该放在当前左右子节点的父节点位置,即k的位置，直接跳出循环
            if (key.compareTo((T) c) <= 0)
                break;
            // 将较小的放在k的位置
            array[k] = c;
            // k继续向下走，左子节点
            k = child;
        }
        // 将最大下标的数据放在k的位置
        array[k] = key;
    }
}
```

#### poll(timeout,unit)方法
```java
public E poll(long timeout, TimeUnit unit) throws InterruptedException {
    long nanos = unit.toNanos(timeout);
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    E result;
    try {
        while ( (result = dequeue()) == null && nanos > 0)
            nanos = notEmpty.awaitNanos(nanos);
    } finally {
        lock.unlock();
    }
    return result;
}
```

#### take()方法
```java
public E take() throws InterruptedException {
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    E result;
    try {
        while ( (result = dequeue()) == null)
            notEmpty.await();
    } finally {
        lock.unlock();
    }
    return result;
}
```

### DelayQueue：延迟队列

#### 重要属性
```java
// 锁
private final transient ReentrantLock lock = new ReentrantLock();
// 优先队列
private final PriorityQueue<E> q = new PriorityQueue<E>();

// 用来标识是否有线程在等待
private Thread leader;

// Condition对象
private final Condition available = lock.newCondition();
```

#### add(E)
```java
public boolean add(E e) {
    return offer(e);
}
```
#### offer(E)
```java
public boolean offer(E e) {
    // 获取锁
    final ReentrantLock lock = this.lock;
    // 加锁
    lock.lock();
    try {
        // 添加到队列中，如果队列为空，则唤醒等待的线程，这里调用的是优先级队列的方法
        q.offer(e);
        // 如果队列中第一个元素就是e，则唤醒等待的线程
        if (q.peek() == e) {
            leader = null;
            available.signal();
        }
        return true;
    } finally {
        lock.unlock();
    }
}

public boolean offer(E e) {
    if (e == null)
        throw new NullPointerException();
    modCount++;
    int i = size;
    if (i >= queue.length)
        grow(i + 1);
    size = i + 1;
    if (i == 0)
        queue[0] = e;
    else
        siftUp(i, e);
    return true;
}
```


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
::: tip 原理

:::
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


