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
    // 扩容
    if (i >= queue.length)
        grow(i + 1);
    // 更新size
    size = i + 1;
    // 判断插入位置，如果是0，则直接插入
    if (i == 0)
        queue[0] = e;
    else
        // 否则需要上移操作，保证小顶堆的特性
        siftUp(i, e);
    return true;
}
```

#### offer(E,long,TimeUnit)
```java
public boolean offer(E e, long timeout, TimeUnit unit) {
    return offer(e);
}
```

#### put(E)
```java
public void put(E e) {
    offer(e);
}
```

#### poll()
```java
public E poll() {
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        // 获取 队列的第一个元素，如果没有元素、或者第一个元素还没到时间，则返回null
        E first = q.peek();
        if (first == null || first.getDelay(NANOSECONDS) > 0)
            return null;
        else
            // 否则返回队列的第一个元素，同时要进行下移操作
            return q.poll();
    } finally {
        lock.unlock();
    }
}

public E poll() {
    if (size == 0)
        return null;
    int s = --size;
    modCount++;
    E result = (E) queue[0];
    E x = (E) queue[s];
    queue[s] = null;
    if (s != 0)
        siftDown(0, x);
    return result;
}
```

#### poll(long,TimeUnit)
```java
public E poll(long timeout, TimeUnit unit) throws InterruptedException {
    long nanos = unit.toNanos(timeout);
    final ReentrantLock lock = this.lock;
    // 上锁
    lock.lockInterruptibly();
    try {
        // 死循环
        for (;;) {
            // 获取队列的第一个元素
            E first = q.peek();
            if (first == null) {
                //如果没有元素，且等待时间小于等于0，则返回null
                if (nanos <= 0)
                    return null;
                else
                    // 否则继续等待
                    nanos = available.awaitNanos(nanos);
            } else {
                // 拿到第一个元素的延迟时间
                long delay = first.getDelay(NANOSECONDS);
                // 时间到了，则返回队列的第一个元素，同时进行下移操作
                if (delay <= 0)
                    return q.poll();
                // 等待时间到了，则返回null
                if (nanos <= 0)
                    return null;
                // 如果时间还没到，则将first置空
                first = null; // don't retain ref while waiting
                // 如果等待时间小于元素的延迟时间，或则leader不为空，则继续等待
                if (nanos < delay || leader != null)
                    nanos = available.awaitNanos(nanos);
                else {
                    // 否则将当前线程设置为leader
                    Thread thisThread = Thread.currentThread();
                    leader = thisThread;
                    try {
                        // 等待delay时间，重新计算剩余等待时间
                        long timeLeft = available.awaitNanos(delay);
                        nanos -= delay - timeLeft;
                    } finally {
                        // 最后将leader设置为null，如果是当前线程
                        if (leader == thisThread)
                            leader = null;
                    }
                }
            }
        }
    } finally {
        if (leader == null && q.peek() != null)
            available.signal();
        lock.unlock();
    }
}
```

#### take()
```java
// 同poll(long,TimeUnit)方法一样，只是不需要计算剩余等待时间，这里是死等
public E take() throws InterruptedException {
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    try {
        for (;;) {
            E first = q.peek();
            if (first == null)
                available.await();
            else {
                long delay = first.getDelay(NANOSECONDS);
                if (delay <= 0)
                    return q.poll();
                first = null; // don't retain ref while waiting
                if (leader != null)
                    available.await();
                else {
                    Thread thisThread = Thread.currentThread();
                    leader = thisThread;
                    try {
                        available.awaitNanos(delay);
                    } finally {
                        if (leader == thisThread)
                            leader = null;
                    }
                }
            }
        }
    } finally {
        if (leader == null && q.peek() != null)
            available.signal();
        lock.unlock();
    }
    }
```
### SynchronousQueue
> 没有锁操作，是一个不存数据的队列， 存放的是生产者和消费者自己 存放和取都是基于`transfer`方法 `transfer`有两种实现，`TransferQueue`，`TransferStack`
```java
// e：null消费者，
//  ：有数据，生产者
//timed：true标识有时间限制
E transfer(E e, boolean timed, long nanos) {
    QNode s = null; 
    // isData:true 生产者  false：消费者
    boolean isData = (e != null);

    for (;;) {
        //拿到尾节点和头节点
        QNode t = tail;
        QNode h = head;
        // 如果尾节点和头节点为空，重新进入循环(一般不会触发)
        if (t == null || h == null)         // saw uninitialized value
            continue;                       // spin
        // 头节点等于尾节点（队列为空） 或者节点类型相同（有节点，但是队列中的角色和当前线程的角色是同一种） 需要将节点放入队列中
        if (h == t || t.isData == isData) { // empty or same-mode
            // 拿到尾节点的下一个节点
            QNode tn = t.next;
            // 如果t 不是尾节点(并发判断，防止其他线程修改了尾节点)
            if (t != tail)                  // inconsistent read
                // 重新进入循环
                continue;
            // 尾节点的下一个节点不是null(说明其他线程添加了节点，但是还没将尾节点指向新加的节点)
            if (tn != null) {               // lagging tail
                // 将尾节点指向最后的节点
                advanceTail(t, tn);
                //重新进入循环
                continue;
            }
            // 看一下时间是不是到了
            if (timed && nanos <= 0)        // can't wait
                //时间到了  直接返回null
                return null;
            // 时间没到，判断s是不是null(因为可能多次循环，所以保证新节点只是new一次就好了)
            if (s == null)
                s = new QNode(e, isData);
            // CAS将t的下一个节点由null变为新节点
            if (!t.casNext(null, s))        // failed to link in
                continue;//修改失败，重新进入循环（可能其他线程添加了节点）
            //CAS成功，将尾节点指向新加的节点
            advanceTail(t, s);              // swing tail and wait
            //走到这里的，就说明是需要等待的，不用等待的再上面就结束了，然后进入等待
            Object x = awaitFulfill(s, e, timed, nanos);
            // 唤醒之后，返回的是s的item，如果相等  节点取消了，
            if (x == s) {                   // wait was cancelled
                //从队列中脱离
                clean(t, s);
                return null;
            }
            //判断下一个不是s 不在队列中
            if (!s.isOffList()) {           // not already unlinked
                // 重新设置头节点
                advanceHead(t, s);          // unlink if head
                if (x != null)              // and forget fields
                    s.item = s;
                s.waiter = null;
            }
            return (x != null) ? (E)x : e;

        } else {                            // complementary-mode
            // 队列中存在元素，并且存在的元素和当前线程执行的mode不一样，说明是来和队列中的元素配对的
            // 获取头节点的后继作为匹配的节点
            QNode m = h.next;               // node to fulfill
            // 如果t不等于尾节点，或者头节点的后继等于null，或者h不等于头节点 （并发判断）
            if (t != tail || m == null || h != head)
                continue;    // 重新循环               // inconsistent read
            // 拿到m中的数据
            Object x = m.item;
            // 如果当前线程的mode和队列中第一个元素的model一样（都是消费者、都是生产者，需要重新设置头节点，然后重新循环）
            if (isData == (x != null) ||    // m already fulfilled
                x == m ||                   // 节点取消
                !m.casItem(x, e)) {         // CAS修改m中的item，从x修改为e，如果修改成功 说明
                advanceHead(h, m);          // dequeue and retry
                continue;
            }
            // 将自己修改为head节点
            advanceHead(h, m);              // successfully fulfilled
            // 唤醒等待的线程
            LockSupport.unpark(m.waiter);
            // x来自于头节点的下一个，不等于null说明队列中存的是生产者，所以当前线程走到这里，说明是消费者，那就返回的是生产者的数据信息x
            // x等于null，说明队列中是消费者，能走到这里说明是生产者，然后返回的是生产者自己的数据，标识投递成功
            return (x != null) ? (E)x : e;
        }
    }
}
```


## JDK中自带的线程池
### newFixedThreadPool
::: tip newFixedThreadPool
固定线程数的线程池，线程是懒加载的，随着任务提交，才会创建线程，队列使用的是LinkedBlockingQueue(无界队列)<br>
* 核心线程数等于最大线程数，因此无需超时时间
* LinkedBlockingQueue是一个单项连边实现的阻塞队列，默认大小为Integer.MAX_VALUE，也就是无界队列，可以存放任意数量的任务，再任务比较多的时候会导致OOM
* 适用于任务量已知，相对耗时的长期任务
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
单例线程池，基于LinkedBlockingQueue实现<br>
* 保证所有任务按照指定顺序执行，线程数固定为1，任务数大于1时会放入到无界队列排队，任务执行完毕，唯一的线程也不会被释放
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
任务只要提交到当前线程池中，就必然有工作线程可以处理，基于SynchronousQueue实现（任务几乎是同时开始）<br>
* 核心线程数是0，最大线程数是29个1，全部都是救急线程（60s后可以回收），可能会创建大量线程从而导致OOM
* SynchronousQueue作为阻塞队列，没有容量，对于每一个take的线程都会阻塞到直到有一个put的线程放入元素为止
* 适合任务数比较密集，但每个人物执行时间较短的情况
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
#### 创建方式
存放线程的容器
```java
private final HashSet<Worker> workers = new HashSet<Worker>();
```
构造方法
```java
public ThreadPoolExecutor(int corePoolSize,
                          int maximumPoolSize,
                          long keepAliveTime,
                          TimeUnit unit,
                          BlockingQueue<Runnable> workQueue,
                          ThreadFactory threadFactory,
                          RejectedExecutionHandler handler)
```
参数介绍：
* `corePoolSize`：核心线程数，定义了最小可以同时运行的线程数量
* `maximumPoolSize`：最大线程数，当队列中存放的任务达到队列容量时，当前可以同时运行的数量变为最大线程数，创建线程并立即执行最新的任务，与核心线程数之间的插值又叫线程池的救急线程数
* `keepAliveTime`：救急线程最大存活时间，当线程中的线程数量大于`corePoolSize`的时候，如果这时没有新的任务提交，核心线程外的线程不会立即销毁，而是会等到`keepAliveTime`时间超时后销毁
* `unit`：`keepAliveTime`参数的时间单位
* `workQueue`：阻塞队列，存放被提交但稍微被执行的任务
* `threadFactory`：线程工厂，创建新线程时用到，可以为线程创建时起名字
* `handler`：拒绝策略，线程到达最大线程数仍有新任务时会执行拒绝策略
  * `RejectedExecutionHandler`有4个实现类
    * `AbortPolicy`：让调用者抛出`RejectedExecutionException`异常，**默认策略**
    * `CallerRunsPolicy`：让调用者运行的调节机制，将某些任务回退到调用者，从而降低新任务的流量
    * `DisCardPolicy`：直接丢弃任务，不给予任何处理也不抛出异常
    * `DiscardOldestPolicy`：放弃队列中最早的任务，把当前任务加入队列中尝试再次提交当前任务
  * 补充：其他阔加拒绝策略
    * `Dubbo`：再抛出`RejectedExecutionException`异常前记录日志，并dump线程信息，方便定位问题
    * `Netty`：创建一个新县城来执行任务
    * `ActiveMQ`：带超时等待（60s）尝试放入队列
    * `PinPoint`：它使用了一个拒绝策略链，会逐一尝试策略连中每种拒绝策略
#### 开发要求
* 线程资源必须通过线程池提供，不允许再应用中自行显示创建线程
  * 使用线程池的好处是减少再创建和销毁线程上所消耗的时间以及系统资源的开销，解决资源不足的问题
  * 如果不适用线程池，有可能造成系统创建大量同类线程而导致消耗完内存或者过度切换的问题
* 线程池不允许使用`Executors`去创建，而是通过`ThreadPoolExecutor`的方式，这样的处理方式更加明确线程池的运行规则，避免资源耗尽的风险
  * `FixedThreadPool`和`SingleThreadPool`：请求队列长度为`Integer.MAX_VALUE`，可能会堆积大量的请求，从而导致OOM
  * `CacheThreadPool`和`ScheduledThreadPool`：允许创建线程数量为`Integer.MAX_VALUE`，可能会创建大量的线程，导致OOM
* 创建多大容量的线程池合适？
    * 一般来说池中总线程数是核心线程数的两倍，确保当核心池有线程停止时，核心池外有线程进入核心池
    * 过小会导致线程不能充分利用系统资源、容易导致饥饿
    * 过大会导致更多的线程上下文切换，占用更多内存
      * 上下文切换：当前任务再执行CPU时间片切换到另一个任务之前会先保存自己的状态，以便下次在切换回这个任务时，可以再加载这个任务的状态，任务从保存到再加载的过程就是以此上下文切换
* 核心线程数常用公式：
  * **`CPU密集型任务（N+1）`**：这种任务消耗的是CPU资源，可以将核心线程数设置为N（CPU核心数） + 1，比CPU核心数多出来一个线程是为了防止线程发生缺页中断，或者其他原因导致的任务暂停而带来的影响。一旦任务暂停，CPU某个核心就会处于空闲状态，而再这种情况下多出来的一个线程就可以充分利用CPU的空闲时间
    * CPU密集型简单理解就是利用CPU计算能力的任务比如再内存中堆大量数据进行分析
  * **`IO密集型任务（2N+1）`**：这种系统CPU处理阻塞状态，用大部分的时间来处理IO交互，而线程再处理IO的适合简短内不会占用CPU来处理，这时就可以将CPU交出给其他线程使用，因此再IO密集型任务的应用中，我们可以多配置一些线程，具体的方法是`2N`或`CPU核数 / （1 - 阻塞系数）`，阻塞系数在0.8-0.9之间
    * IO密集型就是涉及到网络读取，文件读取此类任务，特点是CPU计算耗费时间相比等待IO操作完成的时间来说很少，大部分时间都花在了等待IO操作完成上。
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

#### 提交任务
|方法| 说明                          |
|---|-----------------------------|
|`void execute(Runnable command)`| 提交任务(Executor类API)          |
|`Future<?>submit(Runnable task)`| 提交任务task()                  |
|`Future submit(Callable task)`| 提交任务task,用返回值Future获得任务执行结果 |
|`List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks`|提交tasks中所有任务|
|`List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks, long timeout, TimeUnit unit)`|提交 tasks 中所有任务，超时时间针对所有task，超时会取消没有执行完的任务，并抛出超时异常|
|`T invokeAny(Collection<? extends Callable<T>> tasks)`|提交tasks中所有任务，哪个任务先成功执行完毕，返回此任务执行结果，其他任务取消|

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

#### 关闭方法
|方法|说明|
|---|---|
|`void shutdown()`|线程池状态变为 SHUTDOWN，等待任务执行完后关闭线程池，不会接收新任务，但已提交任务会执行完，而且也可以添加线程（不绑定任务）|
|`List<Runnable> shutdownNow()`|	线程池状态变为 STOP，用 interrupt 中断正在执行的任务，直接关闭线程池，不会接收新任务，会将队列中的任务返回|
|`boolean isShutdown()`|不在 RUNNING 状态的线程池，此执行者已被关闭，方法返回 true|
|`boolean isTerminated()`|线程池状态是否是 TERMINATED，如果所有任务在关闭后完成，返回 true|
|`boolean awaitTermination(long timeout, TimeUnit unit) throws InterruptedException`|调用 shutdown 后，由于调用线程不会等待所有任务运行结束，如果它想在线程池 TERMINATED 后做些事情，可以利用此方法等待|

#### shutdown()
> 停止线程池
```java
public void shutdown() {
    final ReentrantLock mainLock = this.mainLock;
    // 获取线程池全局锁
    mainLock.lock();
    try {
        checkShutdownAccess();
        // 设置线程池状态为 SHUTDOWN，如果线程池状态大于 SHUTDOWN，就不会设置直接返回
        advanceRunState(SHUTDOWN);
        // 中断空闲线程
        interruptIdleWorkers();
        // 空方法，子类可以扩展
        onShutdown(); 
    } finally {
        // 释放线程池全局锁
        mainLock.unlock();
    }
    tryTerminate();
}

// onlyOne == true 说明只中断一个线程 ，false 则中断所有线程
private void interruptIdleWorkers(boolean onlyOne) {
    final ReentrantLock mainLock = this.mainLock;
    / /持有全局锁
    mainLock.lock();
    try {
        // 遍历所有 worker
        for (Worker w : workers) {
            // 获取当前 worker 的线程
            Thread t = w.thread;
            // 条件一成立：说明当前迭代的这个线程尚未中断
            // 条件二成立：说明【当前worker处于空闲状态】，阻塞在poll或者take，因为worker执行task时是要加锁的
            //           每个worker有一个独占锁，w.tryLock()尝试加锁，加锁成功返回 true
            if (!t.isInterrupted() && w.tryLock()) {
                try {
                    // 中断线程，处于 queue 阻塞的线程会被唤醒，进入下一次自旋，返回 null，执行退出相逻辑
                    t.interrupt();
                } catch (SecurityException ignore) {
                } finally {
                    // 释放worker的独占锁
                    w.unlock();
                }
            }
            // false，代表中断所有的线程
            if (onlyOne)
                break;
        }

    } finally {
        // 释放全局锁
        mainLock.unlock();
    }
}
```
#### shutdownNow()
> 直接关闭线程池，不会等待任务执行完成
```java
public List<Runnable> shutdownNow() {
    // 返回值引用
    List<Runnable> tasks;
    final ReentrantLock mainLock = this.mainLock;
    // 获取线程池全局锁
    mainLock.lock();
    try {
        checkShutdownAccess();
        // 设置线程池状态为STOP
        advanceRunState(STOP);
        // 中断线程池中【所有线程】
        interruptWorkers();
        // 从阻塞队列中导出未处理的task
        tasks = drainQueue();
    } finally {
        mainLock.unlock();
    }

    tryTerminate();
    // 返回当前任务队列中 未处理的任务。
    return tasks;
}
```

#### tryTerminate()
> 设置为 TERMINATED 状态 if either (SHUTDOWN and pool and queue empty) or (STOP and pool empty)
```java
final void tryTerminate() {
    for (;;) {
        // 获取 ctl 的值
        int c = ctl.get();
        // 线程池正常，或者有其他线程执行了状态转换的方法，当前线程直接返回
        if (isRunning(c) || runStateAtLeast(c, TIDYING) ||
            // 线程池是 SHUTDOWN 并且任务队列不是空，需要去处理队列中的任务
            (runStateOf(c) == SHUTDOWN && ! workQueue.isEmpty()))
            return;
        
        // 执行到这里说明线程池状态为 STOP 或者线程池状态为 SHUTDOWN 并且队列已经是空
        // 判断线程池中线程的数量
        if (workerCountOf(c) != 0) {
            // 【中断一个空闲线程】，在 queue.take() | queue.poll() 阻塞空闲
            // 唤醒后的线程会在getTask()方法返回null，
            // 执行 processWorkerExit 退出逻辑时会再次调用 tryTerminate() 唤醒下一个空闲线程
            interruptIdleWorkers(ONLY_ONE);
            return;
        }
        // 池中的线程数量为 0 来到这里
        final ReentrantLock mainLock = this.mainLock;
        // 加全局锁
        mainLock.lock();
        try {
            // 设置线程池状态为 TIDYING 状态，线程数量为 0
            if (ctl.compareAndSet(c, ctlOf(TIDYING, 0))) {
                try {
                    // 结束线程池
                    terminated();
                } finally {
                    // 设置线程池状态为TERMINATED状态。
                    ctl.set(ctlOf(TERMINATED, 0));
                    // 【唤醒所有调用 awaitTermination() 方法的线程】
                    termination.signalAll();
                }
                return;
            }
        } finally {
            // 释放线程池全局锁
            mainLock.unlock();
        }
    }
}
```
## Future
<img class="zoom-custom-imgs" :src="$withBase('image/base/juc/img3.png')">

> 继承 Runnable、Future 接口，用于包装 Callable 对象，实现任务的提交
```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
    FutureTask<String> task = new FutureTask<>(new Callable<String>() {
        @Override
        public String call() throws Exception {
            return "Hello World";
        }
    });
    new Thread(task).start();	//启动线程
    String msg = task.get();	//获取返回任务数据
    System.out.println(msg);
}
```
### 构造方法
```java
public FutureTask(Callable<V> callable){
    this.callable = callable;	// 属性注入
    this.state = NEW; 			// 任务状态设置为 new
}

public FutureTask(Runnable runnable, V result) {
    // 适配器模式
    this.callable = Executors.callable(runnable, result);
    this.state = NEW;       
}
public static <T> Callable<T> callable(Runnable task, T result) {
    if (task == null) throw new NullPointerException();
    // 使用装饰者模式将 runnable 转换成 callable 接口，外部线程通过 get 获取
    // 当前任务执行结果时，结果可能为 null 也可能为传进来的值，【传进来什么返回什么】
    return new RunnableAdapter<T>(task, result);
}
static final class RunnableAdapter<T> implements Callable<T> {
    final Runnable task;
    final T result;
    // 构造方法
    RunnableAdapter(Runnable task, T result) {
        this.task = task;
        this.result = result;
    }
    public T call() {
        // 实则调用 Runnable#run 方法
        task.run();
        // 返回值为构造 FutureTask 对象时传入的返回值或者是 null
        return result;
    }
}
```

### 成员属性
#### 重要属性
```java
 * Possible state transitions:
 * NEW -> COMPLETING -> NORMAL
 * NEW -> COMPLETING -> EXCEPTIONAL
 * NEW -> CANCELLED
 * NEW -> INTERRUPTING -> INTERRUPTED
 */
 // 任务状态
private volatile int state;
// 新建状态
private static final int NEW          = 0;
// 执行状态
private static final int COMPLETING   = 1;
// 完成状态
private static final int NORMAL       = 2;
// 异常状态
private static final int EXCEPTIONAL  = 3;
// 取消状态
private static final int CANCELLED    = 4;
// 中断
private static final int INTERRUPTING = 5;
// 中断
private static final int INTERRUPTED  = 6;

// 任务对象
private Callable<V> callable;
// 返回结果
// 正常情况下：任务正常执行结束，outcome 保存执行结果，callable 返回值
// 非正常情况：callable 向上抛出异常，outcome 保存异常
private Object outcome; 
// 执行任务的线程,当前任务被线程执行期间，保存当前执行任务的线程对象引用
private volatile Thread runner;
// 等待结果的Node,会有很多线程去 get 当前任务的结果，这里使用了一种数据结构头插头取（类似栈）的一个队列来保存所有的 get 线程
private volatile WaitNode waiters;

static final class WaitNode {
    // 单向链表
    volatile Thread thread;
    volatile WaitNode next;
    WaitNode() { thread = Thread.currentThread(); }
}

```
