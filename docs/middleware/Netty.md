---
title: Netty
date: 2025-01-08
---

## NIO基础：non-blocking io(非阻塞IO)
::: tip
NIO(New I/O或者Bon-blocking I/O) 是从Java1.4开始引入的一种新的I/O编程方式，相对于传统的IO来说，NIO更加灵活、高效、可靠，能够更好地处理海量数和高并发场景。简单来说就是：并发能力强。
:::


### 三大组件
1. Channel：通道，用于数据的读写
:::tip
Channel是数据传输的双向通道，Stream要不就是读，要不就是写。Channel比Stream更加底层。
常见的Channel有
* FileChannel：文件通道，用于文件读写
* SocketChannel：套接字通道，用于网络通信
* DatagramChannel：数据报通道，用于网络通信
:::
<img class="zoom-custom-imgs" :src="$withBase('image/Netty/img7.png')">

2. Buffer：缓冲区，用于数据的存取
:::tip
Buffer是用来缓冲读写数据的
常见的Buffer有
* ByteBuffer
* CharBuffer
* DoubleBuffer
* FloatBuffer
* IntBuffer
* LongBuffer
* ShortBuffer
:::
3. Selector：选择器，用于监听Channel的IO事件
:::tip
以前的多线程服务器程序，一个线程对应一个Socket，只能合适连接数少的场景。而线程池版本，阻塞模式下，只能处理一个Socket连接。
selector的作用就是配合一个线程来管理多个channel，适合连接数特别多，但流量低的场景。.
:::

| 线程池版本| 多线程版本   |
|------|---------|
| <img class="zoom-custom-imgs" :src="$withBase('image/Netty/img8.png')"> | <img class="zoom-custom-imgs" :src="$withBase('image/Netty/img9.png')"> |

<img class="zoom-custom-imgs" :src="$withBase('image/Netty/img10.png')">
调用selector的select()会阻塞到channel发生了读写就绪事件，这些事件发生，select()方法就会放回这些事件交给thread来处理。

### ByteBuffer

#### ByteBuffer的使用方式
1. 向`buffer`写入数据，调用`channel.read(buffer)`,返回值为实际读取的字节数，若为-1，则表示通道已经关闭
2. 调用`flip()`切换至 **读模式**
3. 从`buffer`中读取数据，调用`channel.write(buffer)`
4. 调用`clear()`或`compact()`切换至 **写模式**
5. 重复步骤1~4

```java
public static void main(String[] args) {
    // 获取文件channel
    // 1.从文件流获取  2. new RandomAccessFile().getChannel()
    try (FileChannel channel = new FileInputStream("pom.xml").getChannel()) {
        // 分配一个缓冲区
        ByteBuffer allocate = ByteBuffer.allocate(1024);
        // 读取文件
        while (channel.read(allocate) != -1) {
            // 切换为读模式
            allocate.flip();
            // 读取数据
            while (allocate.hasRemaining()) {
                logger.info(String.valueOf((char) allocate.get()));
            }
            // 切换为写模式
            allocate.clear();
        }
    } catch (IOException e) {
        e.printStackTrace();
    }
}
```

#### ByteBuffer 结构
##### 重要属性
* `capacity`，表示缓冲区可以存储的最大字节数，不能改变
* `limit`，表示缓冲区可以读取的最大字节数，不能改变
* `position`，表示缓冲区可以写入的最大字节数，不能改变

流程：
初始状态
<img class="zoom-custom-imgs" :src="$withBase('image/Netty/img.png')">
写模式下，position是写入位置，limit等于容量，写入四个字节后的状态
<img class="zoom-custom-imgs" :src="$withBase('image/Netty/img1.png')">
flip动作发生后，position切换为读取位置，limit切换为读取限制
<img class="zoom-custom-imgs" :src="$withBase('image/Netty/img2.png')">
读取四个字节后的状态
<img class="zoom-custom-imgs" :src="$withBase('image/Netty/img3.png')">
clear动作发生后
<img class="zoom-custom-imgs" :src="$withBase('image/Netty/img4.png')">
compact方法，是把未读完的部分向前压缩，然后切换至写模式
<img class="zoom-custom-imgs" :src="$withBase('image/Netty/img5.png')">

调试查看内部结构
* 调试工具类
```java
import io.netty.util.internal.StringUtil;

import java.nio.ByteBuffer;

import static io.netty.util.internal.MathUtil.isOutOfBounds;
import static io.netty.util.internal.StringUtil.NEWLINE;

public class ByteBufferUtil {
    private static final char[] BYTE2CHAR = new char[256];
    private static final char[] HEXDUMP_TABLE = new char[256 * 4];
    private static final String[] HEXPADDING = new String[16];
    private static final String[] HEXDUMP_ROWPREFIXES = new String[65536 >>> 4];
    private static final String[] BYTE2HEX = new String[256];
    private static final String[] BYTEPADDING = new String[16];

    static {
        final char[] DIGITS = "0123456789abcdef".toCharArray();
        for (int i = 0; i < 256; i++) {
            HEXDUMP_TABLE[i << 1] = DIGITS[i >>> 4 & 0x0F];
            HEXDUMP_TABLE[(i << 1) + 1] = DIGITS[i & 0x0F];
        }

        int i;

        // Generate the lookup table for hex dump paddings
        for (i = 0; i < HEXPADDING.length; i++) {
            int padding = HEXPADDING.length - i;
            StringBuilder buf = new StringBuilder(padding * 3);
            for (int j = 0; j < padding; j++) {
                buf.append("   ");
            }
            HEXPADDING[i] = buf.toString();
        }

        // Generate the lookup table for the start-offset header in each row (up to 64KiB).
        for (i = 0; i < HEXDUMP_ROWPREFIXES.length; i++) {
            StringBuilder buf = new StringBuilder(12);
            buf.append(NEWLINE);
            buf.append(Long.toHexString(i << 4 & 0xFFFFFFFFL | 0x100000000L));
            buf.setCharAt(buf.length() - 9, '|');
            buf.append('|');
            HEXDUMP_ROWPREFIXES[i] = buf.toString();
        }

        // Generate the lookup table for byte-to-hex-dump conversion
        for (i = 0; i < BYTE2HEX.length; i++) {
            BYTE2HEX[i] = ' ' + StringUtil.byteToHexStringPadded(i);
        }

        // Generate the lookup table for byte dump paddings
        for (i = 0; i < BYTEPADDING.length; i++) {
            int padding = BYTEPADDING.length - i;
            StringBuilder buf = new StringBuilder(padding);
            for (int j = 0; j < padding; j++) {
                buf.append(' ');
            }
            BYTEPADDING[i] = buf.toString();
        }

        // Generate the lookup table for byte-to-char conversion
        for (i = 0; i < BYTE2CHAR.length; i++) {
            if (i <= 0x1f || i >= 0x7f) {
                BYTE2CHAR[i] = '.';
            } else {
                BYTE2CHAR[i] = (char) i;
            }
        }
    }

    /**
     * 打印所有内容
     * @param buffer
     */
    public static void debugAll(ByteBuffer buffer) {
        int oldlimit = buffer.limit();
        buffer.limit(buffer.capacity());
        StringBuilder origin = new StringBuilder(256);
        appendPrettyHexDump(origin, buffer, 0, buffer.capacity());
        System.out.println("+--------+-------------------- all ------------------------+----------------+");
        System.out.printf("position: [%d], limit: [%d]\n", buffer.position(), oldlimit);
        System.out.println(origin);
        buffer.limit(oldlimit);
    }

    /**
     * 打印可读取内容
     * @param buffer
     */
    public static void debugRead(ByteBuffer buffer) {
        StringBuilder builder = new StringBuilder(256);
        appendPrettyHexDump(builder, buffer, buffer.position(), buffer.limit() - buffer.position());
        System.out.println("+--------+-------------------- read -----------------------+----------------+");
        System.out.printf("position: [%d], limit: [%d]\n", buffer.position(), buffer.limit());
        System.out.println(builder);
    }

    public static void appendPrettyHexDump(StringBuilder dump, ByteBuffer buf, int offset, int length) {
        if (isOutOfBounds(offset, length, buf.capacity())) {
            throw new IndexOutOfBoundsException(
                    "expected: " + "0 <= offset(" + offset + ") <= offset + length(" + length
                            + ") <= " + "buf.capacity(" + buf.capacity() + ')');
        }
        if (length == 0) {
            return;
        }
        dump.append(
                "         +-------------------------------------------------+" +
                        NEWLINE + "         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |" +
                        NEWLINE + "+--------+-------------------------------------------------+----------------+");

        final int startIndex = offset;
        final int fullRows = length >>> 4;
        final int remainder = length & 0xF;

        // Dump the rows which have 16 bytes.
        for (int row = 0; row < fullRows; row++) {
            int rowStartIndex = (row << 4) + startIndex;

            // Per-row prefix.
            appendHexDumpRowPrefix(dump, row, rowStartIndex);

            // Hex dump
            int rowEndIndex = rowStartIndex + 16;
            for (int j = rowStartIndex; j < rowEndIndex; j++) {
                dump.append(BYTE2HEX[getUnsignedByte(buf, j)]);
            }
            dump.append(" |");

            // ASCII dump
            for (int j = rowStartIndex; j < rowEndIndex; j++) {
                dump.append(BYTE2CHAR[getUnsignedByte(buf, j)]);
            }
            dump.append('|');
        }

        // Dump the last row which has less than 16 bytes.
        if (remainder != 0) {
            int rowStartIndex = (fullRows << 4) + startIndex;
            appendHexDumpRowPrefix(dump, fullRows, rowStartIndex);

            // Hex dump
            int rowEndIndex = rowStartIndex + remainder;
            for (int j = rowStartIndex; j < rowEndIndex; j++) {
                dump.append(BYTE2HEX[getUnsignedByte(buf, j)]);
            }
            dump.append(HEXPADDING[remainder]);
            dump.append(" |");

            // Ascii dump
            for (int j = rowStartIndex; j < rowEndIndex; j++) {
                dump.append(BYTE2CHAR[getUnsignedByte(buf, j)]);
            }
            dump.append(BYTEPADDING[remainder]);
            dump.append('|');
        }

        dump.append(NEWLINE +
                "+--------+-------------------------------------------------+----------------+");
    }

    public static void appendHexDumpRowPrefix(StringBuilder dump, int row, int rowStartIndex) {
        if (row < HEXDUMP_ROWPREFIXES.length) {
            dump.append(HEXDUMP_ROWPREFIXES[row]);
        } else {
            dump.append(NEWLINE);
            dump.append(Long.toHexString(rowStartIndex & 0xFFFFFFFFL | 0x100000000L));
            dump.setCharAt(dump.length() - 9, '|');
            dump.append('|');
        }
    }

    public static short getUnsignedByte(ByteBuffer buffer, int index) {
        return (short) (buffer.get(index) & 0xFF);
    }
}
```

##### ByteBuffer 的方法
* 分配空间
  * `allocate(int capacity)`：分配一个指定大小的缓冲区，java堆内存，读写效率低，受到GC影响
  * `allocateDirect(int capacity)`：分配一个指定大小的直接缓冲区，直接内存，读写效率高，不受GC影响，分配效率低
* 写入数据
  * 调用channel的read方法：`channel.read(buffer)`
  * 调用buffer的put方法：`buffer.put(byte)`
* 读取数据
  * 调用channel的write方法：`channel.write(buffer)`
  * 调用buffer的get方法：`buffer.get()`
    * get方法会让position读指针向后移动，如果想重复读取数据
      * 可以调用`rewind()`方法，将position重置为0
      * 调用`get(int i)`方法获取索引i的数据，不会改变position

* 记录mark & reset
  * `mark()`：记录position的位置，用于后续的reset操作
  * `reset()`：将position重置为mark的位置

##### ByteBuffer 和 字符串的转换
```java
public static void main(String[] args) {
    String str = "hello world";
    byte[] bytes = str.getBytes();
    ByteBuffer buffer = ByteBuffer.allocate(bytes.length);
    buffer.put(bytes);

    ByteBuffer helloWorld = StandardCharsets.UTF_8.encode("hello world");


    ByteBuffer wrap = ByteBuffer.wrap(bytes);

    // 转为字符串
    String decode = StandardCharsets.UTF_8.decode(wrap).toString();
    System.out.println(decode);

    buffer.flip();
    String decode1 = StandardCharsets.UTF_8.decode(buffer).toString();
    System.out.println(decode1);
}
```

##### 分散读集中写
* 分散读：将一个缓冲区按照一定规则分割成多个缓冲区，然后从channel中读取到各个缓冲区中
```java
public static void main(String[] args) {
    ByteBuffer b1 = ByteBuffer.allocate(3);
    ByteBuffer b2 = ByteBuffer.allocate(3);
    ByteBuffer b3 = ByteBuffer.allocate(5);
    try (FileChannel channel = new RandomAccessFile("words.txt", "r").getChannel()) {
        channel.read(new ByteBuffer[] { b1, b2, b3});
        b1.flip();
        b2.flip();
        b3.flip();
        while (b1.hasRemaining()) {
            System.out.print((char) b1.get());
        }
        while (b2.hasRemaining()) {
            System.out.print((char) b2.get());
        }
        while (b3.hasRemaining()) {
            System.out.print((char) b3.get());
        }
    } catch (IOException e) {
    }
}
```
* 集中写：将多个缓冲区按照一定规则合并成一个缓冲区，然后写入到channel中
```java
public static void main(String[] args) {
    ByteBuffer b1 = StandardCharsets.UTF_8.encode("hello ");
    ByteBuffer b2 = StandardCharsets.UTF_8.encode("world ");
    ByteBuffer b3 = StandardCharsets.UTF_8.encode("你好");
    try (FileChannel channel = new RandomAccessFile("words1.txt", "rw").getChannel()) {
        channel.write(new ByteBuffer[] { b1, b2, b3 });
    } catch (IOException e) {

    }
}
```

##### 粘包、半包
* 粘包：指的是发送方发送的多个数据包在接收方被合并为一个数据包接收，或者一个完整的消息被分割成多个数据包接收
  发送粘包：发送方连续发送多个小的数据包，接收方接收到的是这些数据包合并后的结果。
  接收拆包：发送方发送的一个大数据包，接收方将其拆分成多个小数据包接收。
```java
public static void main(String[] args) {
    ByteBuffer source = ByteBuffer.allocate(32);
    source.put("Hello,World\nI'm zhangsan\nHo".getBytes());
    split(source);
    source.put("w are you?\n".getBytes());
    split(source);
}

private static void split(ByteBuffer source) {
    source.flip();
    for (int i = 0; i < source.limit(); i++) {
        if (source.get(i) == '\n') {
            int length = i + 1 - source.position();
            ByteBuffer target = ByteBuffer.allocate(length);
            for (int j = 0; j < length; j++) {
                target.put(source.get());
            }
            target.flip();
            System.out.println(StandardCharsets.UTF_8.decode(target).toString());
        }
    }
    source.compact();
}
```

### 文件编程
#### FileChannel
:::tip
FileChannel只能工作在阻塞模式下。
不能直接打开FileChannel，必须通过FileInputStream、FileOutputStream、RandomAccessFile等IO流来获取FileChannel，都有getChannel方法。
* 通过 FileInputStream 获取的 channel 只能读
* 通过 FileOutputStream 获取的 channel 只能写
* 通过 RandomAccessFile 是否能读写根据构造 RandomAccessFile 时的读写模式决定
:::
* 读取
:::: code-group
::: code-group-item Java
```java
// 会从channel读取数据填充ByteBuffer，返回值表示读到了多少字节，-1 表示文件读取完毕
int readBytes = channel.read(buffer);
```
:::
::::

* 写入
:::: code-group
::: code-group-item Java
```java
// 写入的正确方式如下
ByteBuffer buffer = ByteBuffer.allocate(1024);
buffer.put(".."); // 写入数据
buffer.flip();  // 切换读模式
// 在 while 中调用 channel.write 是因为 write 方法并不能保证一次将 buffer 中的内容全部写入 channel
while (buffer.hasRemaining()) {
  channel.write(buffer);
}
```
:::
::::
* 关闭：channel 必须关闭，不过调用了 FileInputStream、FileOutputStream 或者 RandomAccessFile 的 close 方法会间接地调用 channel 的 close 方法

* 大小：使用 size 方法获取文件的大小

* 强制写入：操作系统出于性能的考虑，会将数据缓存，不是立刻写入磁盘。可以调用 force(true) 方法将文件内容和元数据（文件的权限等信息）立刻写入磁盘


#### 两个Channel传输数据

* 小文件
:::: code-group
::: code-group-item Java
```java
String FROM = "helloword/data.txt";
String TO = "helloword/to.txt";
long start = System.nanoTime();
try (FileChannel from = new FileInputStream(FROM).getChannel();
     FileChannel to = new FileOutputStream(TO).getChannel();
) {
    from.transferTo(0, from.size(), to);
} catch (IOException e) {
    e.printStackTrace();
}
long end = System.nanoTime();
System.out.println("transferTo 用时：" + (end - start) / 1000_000.0);
```
:::
::::
* 超大文件
:::: code-group
::: code-group-item Java
```java
public static void main(String[] args) {
    try (
            FileChannel from = new FileInputStream("data.txt").getChannel();
            FileChannel to = new FileOutputStream("to.txt").getChannel();
    ) {
        // 效率高，底层会利用操作系统的零拷贝进行优化
        long size = from.size();
        // left 变量代表还剩余多少字节
        for (long left = size; left > 0; ) {
            System.out.println("position:" + (size - left) + " left:" + left);
            left -= from.transferTo((size - left), left, to);
        }
    } catch (IOException e) {
        e.printStackTrace();
    }
}
```
:::
::::

#### Path
* 遍历文件夹
:::: code-group
::: code-group-item Java
```java
// 要遍历的文件夹
Path path = Paths.get("D:\\Java\\netty");
// 文件夹个数
AtomicInteger dirCount = new AtomicInteger();
// 文件个数
AtomicInteger fileCount = new AtomicInteger();
// 开始遍历
Files.walkFileTree(path, new SimpleFileVisitor<Path>(){
		// 进入文件夹之前的操作
    @Override
    public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
        System.out.println("====> " + dir);
        dirCount.incrementAndGet();
        return super.preVisitDirectory(dir, attrs);
    }
		// 遍历到文件的操作
    @Override
    public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
        System.out.println(file);
        fileCount.incrementAndGet();
        return super.visitFile(file, attrs);
    }
});
System.out.println(dirCount);
System.out.println(fileCount);
```
:::
::::

#### Files
* 检查文件是否存在
```java
Path path = Paths.get("helloword/data.txt");
System.out.println(Files.exists(path));
```
* 创建单级目录
```java
Path path = Paths.get("helloword/d1");
Files.createDirectory(path);
```
* 拷贝文件
```java
Path source = Paths.get("helloword/data.txt");
Path target = Paths.get("helloword/target.txt");

Files.copy(source, target);
```

### 网络编程

#### 处理read事件
##### 为何要手动移除已处理的事件key
##### cancel的作用
##### 处理消息边界
<img class="zoom-custom-imgs" :src="$withBase('image/Netty/img6.png')">
* 固定消息长度，数据报大小一样，服务器按预定长度读取，缺点是浪费带宽
* 按分隔符拆分，缺点是效率低
* TLV格式，即Type类型、Length长度、Value数据，类型和长度已知的情况下，就可以方便获取消息大小，分配合适的buffer，缺点是buffer需要提前分配，如果内容过大，则影响server吞吐量
  * Http 1.1 是TLV格式
  * Http 2.0 是LTV格式



## Netty
* Cassandra - nosql数据库
* Spark - 大数据分布式计算框架
* Hadoop - 大数据分布式存储框架
* RocketMQ - 消息队列
* ElasticSearch - 搜索引擎
* gRPC - rpc框架
* Dubbo - rpc框架
* Spring 5.x - flux api完全抛弃了tomact，替换为netty
* Zookeeper - 分布式协调服务

### Netty的优势
* Netty & NIO
  * 需要自己构建协议
  * 解决TCP传输问腿，粘包、半包问题
  * epoll空论徐导致CPU 100%
  * 对API 进行增强，简化开发
