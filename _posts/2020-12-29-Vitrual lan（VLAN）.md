---
lang: zh-CN
translation_key: vlan-fundamentals
translation_zh: /2020/12/29/Vitrual-lan-VLAN/
translation_en: /en/2020/12/29/vlan/
layout:     post
title:      虚拟局域网（VLAN）
subtitle:   2020年都要过完了，我还没找到可以跳槽的工作。
date:       2020-12-29
author:     i9u
header-img: img/EiAbsj4UwAADTNF.jpeg
catalog: true
tags:
    - layer 2
    - 不学不行系列
---

## 前言

虚拟局域网，英文是 Virtual Local Area Network，下面简称 VLAN。以这次实验的 Cisco 交换机为例，默认的二层接入口都在 VLAN 1。我把不同端口分到不同 VLAN，就像把一台交换机划成了几台逻辑交换机。每个 VLAN 是独立的二层广播域。交换机按 VLAN 转发二层帧，跨 VLAN 通信则要靠三层设备。

802.1Q Tag 的作用是在线路上标识帧属于哪个 VLAN。比如一条 Trunk 同时承载 VLAN 10 和 20，对端就需要知道收到的帧该归到哪个 VLAN。普通 Access 口连 PC 时，线上通常没有标签，交换机按端口的配置归类。早期 Cisco 还有私有的 ISL 封装，这篇实验用的是 IEEE 802.1Q。

## VLAN 的作用

VLAN 除了把交换机在逻辑上划成多个广播域，我平常还会拿它做这几件事。

1. **隔离业务。** 不同 VLAN 的主机不能直接做二层通信。开了跨 VLAN 路由以后，哪些业务能互访，还要看 ACL 或防火墙策略。
2. **方便管理。** 可以按业务或部门分配 VLAN，排障时也更容易确定流量应该出现在哪里。
3. **缩小泛洪范围。** 广播和二层泛洪留在各自的 VLAN 内。同一个 VLAN 仍然可能发生广播风暴，VLAN 划分能限制它的影响范围。

## 802.1Q 标签与 VLAN ID

802.1Q 的 4 字节标签插在以太网帧的源 MAC 地址之后。

| 字段 | 长度 | 含义 |
| --- | --- | --- |
| TPID | 16 bit | Tag Protocol Identifier，标识标签类型。常见的 802.1Q C-Tag 用 `0x8100`。 |
| PCP | 3 bit | Priority Code Point，表示二层优先级。 |
| DEI | 1 bit | Drop Eligible Indicator，表示拥塞时是否可优先丢弃。旧资料里同一位置常写 CFI。 |
| VID | 12 bit | VLAN Identifier，用来标识 VLAN。 |

VID 有 12 bit，字段能表示 `0–4095`。以 Cisco Catalyst 的常见划分为例：

| VID | 用途 |
| --- | --- |
| `0` | 优先级标签，用来携带优先级信息，不表示帧属于 VLAN 0。 |
| `1` | 这类 Cisco 交换机的默认 VLAN，可以使用，不能删除。 |
| `2–1001` | 普通范围内通常可供用户配置的以太网 VLAN。 |
| `1002–1005` | 普通范围内为 FDDI 和 Token Ring 保留的 Cisco 默认 VLAN。 |
| `1006–4094` | 扩展范围。哪些 ID 可用、能建多少个 VLAN，要看平台、软件和 VTP 模式；设备也可能占用个别 ID。 |
| `4095` | 保留值。 |

[参考 Cisco 的标签字段说明](https://learningnetwork.cisco.com/s/article/implement-and-troubleshoot-trunking)和 [VLAN 范围说明](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3750x_3560x/software/release/15-2_1_e/configuration/guide/scg3750x/swvlan.html)。

## 配置 VLAN

这次按端口划分 VLAN。我先在交换机上创建 VLAN 10 和 VLAN 20，再把接入端口划到对应的 VLAN。下面是实验拓扑。

<img src="https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/vlan/image-20201230172508037.png" alt="image-20201230172508037" style="zoom:67%;" />

### 1. 创建 VLAN

先在交换机上创建 VLAN 10 和 VLAN 20。

```
Switch(config)#vlan 10
Switch(config-vlan)#name blue
Switch(config-vlan)#exit
Switch(config)#vlan 20
Switch(config-vlan)#name red
Switch(config-vlan)#exit
```

创建完成后，用 `show vlan` 检查两个 VLAN 是否存在。

```
Switch#show vlan 

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/0, Et0/1, Et0/2, Et0/3
10   blue                             active    
20   red                              active    
1002 fddi-default                     act/unsup 
1003 token-ring-default               act/unsup 
1004 fddinet-default                  act/unsup 
1005 trnet-default                    act/unsup 
```

### 2. 分配 Access 端口

按拓扑，把 `Ethernet0/0` 和 `Ethernet0/2` 划入 VLAN 10，把 `Ethernet0/1` 和 `Ethernet0/3` 划入 VLAN 20。

```
VLAN 10

Switch(config)#inter ether0/0
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 10
Switch(config-if)#no shu
Switch(config-if)#exit
Switch(config)#inter ether0/2
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 10
Switch(config-if)#no shu
Switch(config-if)#exit

VLAN 20

Switch(config)#inter ether0/1
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 20
Switch(config-if)#no shu
Switch(config-if)#exit
Switch(config)#inter ether0/3
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 20
Switch(config-if)#no shu
Switch(config-if)#exit
```

配置完成后，再用 `show vlan` 核对各端口归属。

<img src="https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/vlan/image-20201230173123385.png" alt="image-20201230173123385" style="zoom:67%;" />

### 3. 验证 VLAN 隔离

这次我故意给四台主机都配上 `10.1.1.0/24` 里的地址。这样主机会把对方当作同网段邻居，直接发 ARP，正好可以观察 VLAN 对广播的隔离。

| 主机 | IP 地址 |
| --- | --- |
| VPC1 | `10.1.1.1/24` |
| VPC2 | `10.1.1.2/24` |
| VPC3 | `10.1.1.3/24` |
| VPC4 | `10.1.1.4/24` |

我用 VPC1 分别 ping VPC3 和 VPC2。原抓包图已遗失，下面是当时笔记记录的实验现象。

| 测试 | VLAN 关系 | 实验观察 |
| --- | --- | --- |
| VPC1 → VPC3（`10.1.1.3`） | 同属 VLAN 10 | ARP 能解析到对端 MAC，ICMP 正常往返。 |
| VPC1 → VPC2（`10.1.1.2`） | 分属 VLAN 10 和 VLAN 20 | VPC1 多次发送 ARP Request，未收到 VPC2 的回复，ping 不通。 |

同一个 IP 子网里的两台主机，放到不同 VLAN 后，ARP 广播也跨不过去。从逻辑上看，拓扑就像下面这样。

![VLAN 10 与 VLAN 20 的逻辑隔离](https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/vlan/image-20201230181141544.png)

这四台主机虽然都配在同一个 IP 子网里，但交换机上的四个端口分属两个广播域。VPC1 发出的 ARP Request 留在 VLAN 10，VLAN 20 里的 VPC2 收不到它。

实际部署时，通常给不同的业务 VLAN 配不同的 IP 子网，便于通过各自网关做路由。这里把四台主机放在同一个 IP 子网，是为了单独观察二层广播域。

## Access、Trunk 和 Hybrid

下面用 Cisco 和华为的配置举例，看看 Access、Trunk 和 Hybrid 怎么处理标签。

### Access

Access 口通常接普通终端。无标签入站帧归入端口配置的 Access VLAN，发往终端的帧通常不带标签。

```
Cisco
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 10

Huawei
[HUAWEI-GigabitEthernet1/0/1] port link-type access
[HUAWEI-GigabitEthernet1/0/1] port default vlan 10
```

### Trunk

Trunk 可以承载多个 VLAN，常用来连接交换机或虚拟化主机。Allowed list 决定端口允许哪些 VLAN 通过。在这次 Cisco 802.1Q 实验中，非 Native VLAN 的帧出站带标签，Native VLAN 默认不带标签。

```
Cisco
Switch(config-if)#switchport trunk encapsulation dot1q
Switch(config-if)#switchport mode trunk
Switch(config-if)#switchport trunk allowed vlan 10,20

Huawei
[HUAWEI-GigabitEthernet1/0/2] port link-type trunk
[HUAWEI-GigabitEthernet1/0/2] port trunk allow-pass vlan 10 20
```

### Hybrid

以华为为例，Hybrid 口可以按 VLAN 分别指定出站帧带标签还是不带标签，无标签入站帧按端口的 PVID 归类。下面的命令把 VLAN 10 加入出站带标签的列表。

```
[HUAWEI] interface gigabitethernet 1/0/3
[HUAWEI-GigabitEthernet1/0/3] port link-type hybrid
[HUAWEI-GigabitEthernet1/0/3] port hybrid tagged vlan 10
```
上面的 Cisco 示例在支持选择封装的接口上使用 `switchport trunk encapsulation dot1q`。固定使用 802.1Q 的平台直接配置 Trunk 模式即可。 [Cisco Trunk 配置指南](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/vlan/vlan-configuration-guide/configure-vlan-trunks.html) · [华为端口类型说明](https://info.support.huawei.com/info-finder/encyclopedia/en/VLAN.html)

## Native VLAN 和 VLAN 1

在这次 Cisco 实验里，802.1Q Trunk 的默认 Native VLAN 是 VLAN 1。按默认标签行为，Native VLAN 的数据帧出站不带 802.1Q 标签，收到的无标签帧也归入 Native VLAN。把 Native VLAN 改成 10 后，无标签的数据帧就按 VLAN 10 处理。两端的设置要一致。有些平台还能配置 Native VLAN 出站带标签。

在这类 Cisco 交换机上，VLAN 1 也是二层接入口的默认 VLAN。生产上我会把用户业务与管理流量分开。BPDU、VTP 和 CDP 怎么封装、由哪些端口处理，要分别看协议和设备平台。

下面用 `show interfaces trunk` 查看 Native VLAN，并演示怎么把它设为 VLAN 10。 [Cisco Native VLAN 排障](https://learningnetwork.cisco.com/s/article/implement-and-troubleshoot-trunking)

```
Switch#show inter trunk

Port        Mode             Encapsulation  Status        Native vlan
Et0/0       on               802.1q         trunking      10

interface Ethernet0/0
 switchport trunk allowed vlan 10,20
 switchport trunk encapsulation dot1q
 switchport trunk native vlan 10
 switchport mode trunk

```

## 同一 VLAN 跨交换机访问

这次用两台交换机做个完整实验。先配 VLAN 和 Access 口，再用 Trunk 把同一个 VLAN 延伸到对端，验证同 VLAN 的主机能否互访。

![image-20210104155812617](https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/vlan/image-20210104155812617.png)

### 1. 在两台交换机上创建 VLAN

```
Switch(config)#vlan 10
Switch(config-vlan)#name blue
Switch(config-vlan)#exit
Switch(config)#vlan 20
Switch(config-vlan)#name red
Switch(config-vlan)#exit
```

### 2. 分配 Access 端口

```
左边的交换机

Switch(config)#inter ether0/1
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 10
Switch(config-if)#no shu
Switch(config-if)#exit
Switch(config)#inter ether0/2
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 20
Switch(config-if)#no shu
Switch(config-if)#exit

右边的交换机

Switch(config)#inter ether0/1
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 10
Switch(config-if)#no shu
Switch(config-if)#exit
Switch(config)#inter ether0/3
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 20
Switch(config-if)#no shu
Switch(config-if)#exit
```

### 3. 配置互联 Trunk

两台交换机之间的互联口都配置成 Trunk，放行 VLAN 10、20，并把两端的 Native VLAN 都设为 10，与下面的实验输出和抓包一致。

```
Switch(config-if)#switchport trunk encapsulation dot1q
Switch(config-if)#switchport mode trunk
Switch(config-if)#switchport trunk allowed vlan 10,20
Switch(config-if)#switchport trunk native vlan 10
```

### 4. 检查 Trunk 状态

在两端用 `show interfaces trunk` 确认端口处于 trunking 状态、Native VLAN 一致，并检查 VLAN 10、20 是否已放行、处于 active 和 STP forwarding 状态。下面是原实验的状态输出节选。

```
Switch#show inter trunk

Port        Mode             Encapsulation  Status        Native vlan
Et0/0       on               802.1q         trunking      10
```

### 5. 验证连通性

从 VPC1 分别 ping 同 VLAN 和不同 VLAN 的主机。这个阶段只配置了二层交换，尚未配置跨 VLAN 的三层转发。

```
VPC1#ping 10.1.1.2
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 10.1.1.2, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms
VPC1#ping 20.1.1.2
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 20.1.1.2, timeout is 2 seconds:
.....
Success rate is 0 percent (0/5)
```

### 6. 抓包对比 VLAN 20 和 Native VLAN 10

在交换机互联的 Trunk 上抓包。第一张图选中的是 VLAN 20 的 ICMP，Wireshark 解出了 802.1Q 标签，VID 为 20。

<img src="https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/vlan/image-20210104160805656.png" alt="image-20210104160805656" style="zoom:80%;" />

第二张图选中的是 VLAN 10 的 ICMP。同一实验里，VLAN 10 是 Native VLAN，所以这帧没有 802.1Q 标签。两张图对照的是不同 VLAN 的帧。

<img src="https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/vlan/image-20210104160850405.png" alt="image-20210104160850405" style="zoom: 80%;" />

## 跨 VLAN 路由

前面的实验只做了二层交换。现在让两个 VLAN 互访，主机把跨子网的流量交给默认网关，由网关负责路由。下面分别用单臂路由和三层交换机来做。

### 1. 单臂路由

简单来说，我用一条 Trunk 把交换机连到路由器，在路由器上为不同 VLAN 配置对应的 802.1Q 子接口。路由器根据目的 IP 查路由，决定从哪个子接口转发；需要时再用 ARP 解析下一跳的 MAC。

这种做法只需要一条物理链路。每个跨 VLAN 数据包都要先从交换机发到路由器，再沿同一条链路的反方向回到交换机。各 VLAN 的跨 VLAN 流量共享这条链路在两个方向上的容量。

先看单臂路由的拓扑。

<img src="https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/vlan/image-20210106165619600.png" alt="image-20210106165619600" style="zoom: 67%;" />

| VLAN | 主机 IP | R1 网关 |
| --- | --- | --- |
| VLAN 10（蓝色） | VPC3 `10.1.1.1`、VPC4 `10.1.1.2` | `10.1.1.254` |
| VLAN 20（红色） | VPC1 `20.1.1.1`、VPC2 `20.1.1.2` | `20.1.1.254` |

下面是 R1 和 SW 的配置。SW 上先创建 VLAN 10 和 20，并确认 Trunk 的标签配置和路由器子接口一致。VLAN 10 的主机把 `10.1.1.254` 设为默认网关，VLAN 20 的主机则用 `20.1.1.254`。

```
R1

interface Ethernet0/0
 no ip address
 duplex auto
!
interface Ethernet0/0.1
 encapsulation dot1Q 10
 ip address 10.1.1.254 255.255.255.0
!
interface Ethernet0/0.2
 encapsulation dot1Q 20
 ip address 20.1.1.254 255.255.255.0
 
 
SW
interface Ethernet0/0
 switchport trunk allowed vlan 10,20
 switchport trunk encapsulation dot1q
 switchport mode trunk
!
 interface Ethernet1/0
 switchport access vlan 10
 switchport mode access
!
interface Ethernet1/1
 switchport access vlan 10
 switchport mode access
!
interface Ethernet1/2
 switchport access vlan 20
 switchport mode access
!
interface Ethernet1/3
 switchport access vlan 20
 switchport mode access
```

下图是 VPC3 的流量路径。蓝线是同 VLAN 通信，帧由交换机直接转发。红线是跨 VLAN 通信，流量经同一条 Trunk 到 R1，由 R1 路由后再送回交换机。

<img src="https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/vlan/image-20210106171122519.png" alt="image-20210106171122519" style="zoom:67%;" />

### 2. 在三层交换机上配置 SVI

这次我把网关放到交换机上。Cisco 把这样的 VLAN 三层接口叫 SVI，华为叫 VLANIF。有些二层交换机也支持用 SVI 管理设备；能不能让两个 VLAN 通过 SVI 互访，要看平台是否支持并启用了三层路由。

下面是 SVI 实验的拓扑。

![image-20210106173147451](https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/vlan/image-20210106173147451.png)

沿用上一个实验的 VLAN 和网关地址，这次把网关配在交换机的 VLAN 接口上。

```
interface Ethernet1/0
 switchport access vlan 10
 switchport mode access
!
interface Ethernet1/1
 switchport access vlan 10
 switchport mode access
!
interface Ethernet1/2
 switchport access vlan 20
 switchport mode access
!
interface Ethernet1/3
 switchport access vlan 20
 switchport mode access
!
interface Vlan10
 ip address 10.1.1.254 255.255.255.0
!
interface Vlan20
 ip address 20.1.1.254 255.255.255.0
```

用 `show ip interface brief` 检查两个 SVI。下面的输出里，`Vlan10` 和 `Vlan20` 都是 `up/up`。

```
Switch#show ip inter brief
Interface              IP-Address      OK? Method Status                Protocol
Ethernet1/0            unassigned      YES unset  up                    up      
Ethernet1/1            unassigned      YES unset  up                    up      
Ethernet1/2            unassigned      YES unset  up                    up      
Ethernet1/3            unassigned      YES unset  up                    up      
Vlan10                 10.1.1.254      YES manual up                    up      
Vlan20                 20.1.1.254      YES manual up                    up   
```

这里用 `show ip interface brief` 看 SVI 是否为 `up/up`。以实验中的 Cisco Autostate 行为为例，要检查三件事：

1. 本机 VLAN 已创建且处于 active 状态。
2. SVI 本身没有被 shutdown。
3. 至少有一个参与 Autostate 的二层端口承载该 VLAN，链路为 up，并且在该 VLAN 上处于 STP forwarding 状态。Access 口和放行该 VLAN 的 Trunk 都可以满足这个条件。

另外，各主机要使用对应 SVI 的 IP 作为默认网关。对这次的 Cisco 实验平台，如果设备尚未启用 IPv4 路由，还需要配置 `ip routing`。其他平台的命令和默认行为以设备文档为准。 [Cisco SVI Autostate](https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/41141-188.html)

```
Switch(config)#ip routing
```

## 总结

把这几个实验串起来看，VLAN 解决的是二层广播域怎么划分。主机发来的无标签帧进了 Access 口，交换机按端口配置把它归到对应的 VLAN。同一个 VLAN 要跨交换机，就看 Trunk 有没有放行。带标签的帧按 VID 识别，无标签的帧按两端约定的 Native VLAN 归类。两个 VLAN 要互访，就得经过三层网关，单臂路由用的是路由器的子接口，三层交换机用的是 SVI。排障时也可以照着帧走的路径查，先看进了哪个 VLAN，再看 Trunk 能不能把它送到对端，需要跨 VLAN 时再查网关和路由。
