---
layout:     post
title:      H3C实现IPSec over GRE典型配置
subtitle:   使用的模拟器是H3C的官方模拟器HCL，可以从它的官网处下载。
date:       2020-08-12
author:     i9u
header-img: img/Ec5R55jWkAAssjO-min.png
catalog: true
tags:
    - H3C
    - IPSec
    - GRE
    - VPN
    - 配置案例
---

# H3C实现IPSec over GRE典型配置

IPSec over GRE 指使用GRE对使用IPSec封装的数据包进行封装，IPSec over GRE在隧道接口上实现IPSec加密。系统检测隧道接口上需要加密的数据流（配置一个ACL来匹配两个用户网段之间的数据流）。匹配ACL的任何数据包都会被封装成IPSec数据包，然后在通过隧道传输之前封装成GRE数据包。与ACL不匹配的数据包会直接在GRE隧道中传输，而不会使用IPSec进行封装，这意味着这些数据包的传输方式并不安全。此外，GRE隧道在设置时不受IPSec保护。

你可以认为IPSec over GRE的安全性是不全面的，因为它只会加密被ACL所匹配的流量，隧道的建立过程没有加密，没被匹配到的流量不会被加密。

## 0. 实验环境

Router A和Router B之间建立GRE隧道，Router A和Router B下的PC网段间流量走GRE，并用 IPsec 保护经过 GRE 隧道的指定流量，Router C 模拟 ISP 侧设备。

模拟器：H3C官方模拟器HCL，即H3C Cloud Lab

设备：H3C MSR36-20 Version 7.1.075, Alpha 7571

拓扑图：

![image-20200812151037409](https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/sdn/image-20200812151037409.png)

## 1. 基础配置

A和B之间使用静态路由使出口路由可达，并且先起个OSPF进程，使用环回口作为Router-id，因为最后它们要在tunnel上实现OSPF的互联。

Router A：

```
#
ospf 1 router-id 100.1.1.1
 area 0.0.0.0
#
interface LoopBack0
 ip address 100.1.1.1 255.255.255.0
 ospf 1 area 0.0.0.0
#
interface GigabitEthernet0/0
 port link-mode route
 ip address 10.1.1.2 255.255.255.0
#
interface GigabitEthernet0/1
 port link-mode route
 ip address 192.168.1.1 255.255.255.0
 ospf 1 area 0.0.0.0

#
 ip route-static 0.0.0.0 0 10.1.1.1
#
```

Router C：

```

#
interface GigabitEthernet0/0
 port link-mode route
 ip address 10.1.1.1 255.255.255.0
#
interface GigabitEthernet0/1
 port link-mode route
 ip address 20.1.1.1 255.255.255.0

#
```

Router B：

```
#
ospf 1 router-id 200.1.1.1
 area 0.0.0.0
#
interface LoopBack0
 ip address 200.1.1.1 255.255.255.0
 ospf 1 area 0.0.0.0
#
interface GigabitEthernet0/0
 port link-mode route
 ip address 20.1.1.2 255.255.255.0
#
interface GigabitEthernet0/1
 port link-mode route
 ip address 192.168.2.1 255.255.255.0
 ospf 1 area 0.0.0.0

#
 ip route-static 0.0.0.0 0 20.1.1.1
#
```

## 2. GRE tunnel 配置

模拟器默认设备系统版本都是V7，需要在创建Tunnel的时候就指定为GRE隧道。Tunnel要将源设定为自己的出口IP，目的是对端的设备的出口IP，以A为视角的话，Tunnel source 就是它的出口IP，destination是B的出口IP，反过来也是这样。顺便将OSPF网络设定成P2P模式，方便快速建立邻居。

Router A：

```

interface Tunnel0 mode gre
 ip address 172.16.1.1 255.255.255.0
 ospf network-type p2p
 ospf 1 area 0.0.0.0
 source 10.1.1.2
 destination 20.1.1.2

```

Router B：

```

interface Tunnel0 mode gre
 ip address 172.16.1.2 255.255.255.0
 ospf network-type p2p
 ospf 1 area 0.0.0.0
 source 20.1.1.2
 destination 10.1.1.2

```

## 3. IPSec 配置

两台设备都需要创建ACL抓取需要加密的流量，不然不会触发IPSec加密行为。同时需要注意transform-set的加密和认证参数需要一致， V7设备预共享密钥的配置需要在ike keychain中配置，不同于V5设备。建议在实际生产环境中操作的时候最好直接使用复制粘贴来配置IPSec policy。

Router A：

```
acl advanced 3000
 rule 0 permit ip source 192.168.1.0 0.0.0.255 destination 192.168.2.0 0.0.0.255
 rule 5 permit ip source 192.168.2.0 0.0.0.255 destination 192.168.1.0 0.0.0.255

#
ipsec transform-set 123
 esp encryption-algorithm 3des-cbc
 esp authentication-algorithm md5
#
ipsec policy 123 1 isakmp
 transform-set 123
 security acl 3000
 remote-address 172.16.1.2
#
ike keychain 1
 pre-shared-key address 172.16.1.2 255.255.255.255 key simply 123

```

Router B：

```
acl advanced 3000
 rule 0 permit ip source 192.168.1.0 0.0.0.255 destination 192.168.2.0 0.0.0.255
 rule 5 permit ip source 192.168.2.0 0.0.0.255 destination 192.168.1.0 0.0.0.255

#
ipsec transform-set 123
 esp encryption-algorithm 3des-cbc
 esp authentication-algorithm md5
#
ipsec policy 123 1 isakmp
 transform-set 123
 security acl 3000
 remote-address 172.16.1.1
#
ike keychain 1
 pre-shared-key address 172.16.1.1 255.255.255.255 key simply 123

```

## 4. 启用IPSec

最后，我们只要在tunnel口下把在第三步创建的IPSec policy 调用出来就可以了。

Router A/B：

```
interface Tunnel0 mode gre
 ipsec apply policy 123
```

## 5. 验证结果

我们直接ping下，会发现IPSec第一个包都会超时，这是正常的，只要通了那就代表配置没错了。

<img src="https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/sdn/image-20200812153509793.png" alt="image-20200812153509793" style="zoom:67%;" />

由于Router A和Router B内网的流量已在ACL中定义为需加密保护的流量，因此将触发IPsec进行加密。可以通过如下显示信息看到，IKE协商成功，生成了SA。

```
<H3C>display ike sa
    Connection-ID   Remote                Flag         DOI
------------------------------------------------------------------
    1               172.16.1.1            RD           IPsec
Flags:
RD--READY RL--REPLACED FD-FADING RK-REKEY

```

可以通过如下显示信息查看协商生成的IPsec SA。

```
<H3C>display ipsec sa
-------------------------------
Interface: Tunnel0
-------------------------------

  -----------------------------
  IPsec policy: 123
  Sequence number: 1
  Mode: ISAKMP
  -----------------------------
    Tunnel id: 0
    Encapsulation mode: tunnel
    Perfect Forward Secrecy:
    Inside VPN:
    Extended Sequence Numbers enable: N
    Traffic Flow Confidentiality enable: N
    Path MTU: 1420
    Tunnel:
        local  address: 172.16.1.2
        remote address: 172.16.1.1
    Flow:
        sour addr: 192.168.2.0/255.255.255.0  port: 0  protocol: ip
        dest addr: 192.168.1.0/255.255.255.0  port: 0  protocol: ip

    [Inbound ESP SAs]
      SPI: 1503174692 (0x5998a024)
      Connection ID: 30064771075
      Transform set: ESP-ENCRYPT-3DES-CBC ESP-AUTH-MD5
      SA duration (kilobytes/sec): 1843200/3600
      SA remaining duration (kilobytes/sec): 1843199/3316
      Max received sequence-number: 4
      Anti-replay check enable: Y
      Anti-replay window size: 64
      UDP encapsulation used for NAT traversal: N
      Status: Active

    [Outbound ESP SAs]
      SPI: 3411111458 (0xcb516e22)
      Connection ID: 30064771074
      Transform set: ESP-ENCRYPT-3DES-CBC ESP-AUTH-MD5
      SA duration (kilobytes/sec): 1843200/3600
      SA remaining duration (kilobytes/sec): 1843199/3316
      Max sent sequence-number: 4
      UDP encapsulation used for NAT traversal: N
      Status: Active

```

可以通过如下显示信息查看GRE隧道的建立情况。

```
[H3C]display interface tunnel0
Tunnel0
Current state: UP
Line protocol state: UP
Description: Tunnel0 Interface
Bandwidth: 64 kbps
Maximum transmission unit: 1476
Internet address: 172.16.1.2/24 (primary)
Tunnel source 20.1.1.2, destination 10.1.1.2
Tunnel keepalive disabled
Tunnel TTL 255
Tunnel protocol/transport GRE/IP
    GRE key disabled
    Checksumming of GRE packets disabled
Output queue - Urgent queuing: Size/Length/Discards 0/100/0
Output queue - Protocol queuing: Size/Length/Discards 0/500/0
Output queue - FIFO queuing: Size/Length/Discards 0/75/0
Last clearing of counters: Never
Last 300 seconds input rate: 18 bytes/sec, 144 bits/sec, 0 packets/sec
Last 300 seconds output rate: 18 bytes/sec, 144 bits/sec, 0 packets/sec
Input: 1711 packets, 122752 bytes, 0 drops
Output: 1699 packets, 120360 bytes, 0 drops

```

GRE封装后，抓包软件仍能识别出里面的 ICMP 报文：

![image-20200821121125152](https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/snd/image-20200821121125152.png)

启用 IPsec 后，抓包显示的是 ESP。

![image-20200821121147484](https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/snd/image-20200821121147484.png)

## 6. 改用GRE over IPSec方案

GRE over IPSec技术是使用IPSec对已经被GRE封装的数据包进行封装。GRE over IPSec在物理接口上实现IPSec加密。系统检测需要在物理接口上加密的GRE数据流（配置一个ACL，以匹配两个网关之间的GRE数据流）。这样一来，所有通过GRE隧道传输的数据流都受到IPSec的保护。GRE隧道在设置时也受到IPSec的保护。

GRE over IPSec支持隧道和传输模式下的封装。在隧道模式下，IPSec数据包头被插入到数据包中。因此，数据包的长度较长，而且往往会被碎片化。建议使用传输模式来防止不必要的碎片。

也就是说，只需要在原本的方案上稍微修改下pre-shared-key和remote-address的地址为物理接口IP，并且在物理接口上调用，那就变成GRE先封装，IPSec后封装的方案。

### 6.1. 配置修改

Router A：

```
acl advanced 3000
 rule 0 permit ip source 10.1.1.2 32 destination 20.1.1.2 32
#
ipsec transform-set 123
 esp encryption-algorithm 3des-cbc
 esp authentication-algorithm md5
#
ipsec policy 123 1 isakmp
 transform-set 123
 security acl 3000
 remote-address 20.1.1.2
#
ike keychain 1
 pre-shared-key address 20.1.1.2 255.255.255.255 key simply 123
#
interface GigabitEthernet0/0
ipsec apply policy 123

```

Router B：

```
acl advanced 3000
 rule 0 permit ip source 20.1.1.2 32 destination 10.1.1.2 32
#
ipsec transform-set 123
 esp encryption-algorithm 3des-cbc
 esp authentication-algorithm md5
#
ipsec policy 123 1 isakmp
 transform-set 123
 security acl 3000
 remote-address 20.1.1.2
#
ike keychain 1
 pre-shared-key address 20.1.1.2 255.255.255.255 key simply 123
#
interface GigabitEthernet0/0
ipsec apply policy 123
```

### 6.2 验证结果

```
[H3C]dis ike sa
    Connection-ID   Remote                Flag         DOI
------------------------------------------------------------------
    10              20.1.1.2              RD           IPsec
Flags:
RD--READY RL--REPLACED FD-FADING RK-REKEY

```

```
[H3C]dis ipsec sa
-------------------------------
Interface: GigabitEthernet0/0
-------------------------------

  -----------------------------
  IPsec policy: 123
  Sequence number: 1
  Mode: ISAKMP
  -----------------------------
    Tunnel id: 0
    Encapsulation mode: tunnel
    Perfect Forward Secrecy:
    Inside VPN:
    Extended Sequence Numbers enable: N
    Traffic Flow Confidentiality enable: N
    Path MTU: 1444
    Tunnel:
        local  address: 10.1.1.2
        remote address: 20.1.1.2
    Flow:
        sour addr: 10.1.1.2/255.255.255.255  port: 0  protocol: ip
        dest addr: 20.1.1.2/255.255.255.255  port: 0  protocol: ip

    [Inbound ESP SAs]
      SPI: 3221028236 (0xbffcfd8c)
      Connection ID: 98784247808
      Transform set: ESP-ENCRYPT-3DES-CBC ESP-AUTH-MD5
      SA duration (kilobytes/sec): 1843200/3600
      SA remaining duration (kilobytes/sec): 1843199/3419
      Max received sequence-number: 9
      Anti-replay check enable: Y
      Anti-replay window size: 64
      UDP encapsulation used for NAT traversal: N
      Status: Active

    [Outbound ESP SAs]
      SPI: 3175456113 (0xbd459d71)
      Connection ID: 193273528321
      Transform set: ESP-ENCRYPT-3DES-CBC ESP-AUTH-MD5
      SA duration (kilobytes/sec): 1843200/3600
      SA remaining duration (kilobytes/sec): 1843198/3419
      Max sent sequence-number: 10
      UDP encapsulation used for NAT traversal: N
      Status: Active

  -----------------------------
  IPsec policy: 123
  Sequence number: 1
  Mode: ISAKMP
  -----------------------------
    Tunnel id: 0
    Encapsulation mode: tunnel
    Perfect Forward Secrecy:
    Inside VPN:
    Extended Sequence Numbers enable: N
    Traffic Flow Confidentiality enable: N
    Path MTU: 1444
    Tunnel:
        local  address: 10.1.1.2
        remote address: 20.1.1.2
    Flow:
        sour addr: 10.1.1.2/255.255.255.255  port: 0  protocol: ip
        dest addr: 20.1.1.2/255.255.255.255  port: 0  protocol: ip

    [Inbound ESP SAs]
      SPI: 2902764455 (0xad04aba7)
      Connection ID: 12884901891
      Transform set: ESP-ENCRYPT-3DES-CBC ESP-AUTH-MD5
      SA duration (kilobytes/sec): 1843200/3600
      SA remaining duration (kilobytes/sec): 1843197/3469
      Max received sequence-number: 28
      Anti-replay check enable: Y
      Anti-replay window size: 64
      UDP encapsulation used for NAT traversal: N
      Status: Active

    [Outbound ESP SAs]
      SPI: 2962522711 (0xb0948257)
      Connection ID: 12884901890
      Transform set: ESP-ENCRYPT-3DES-CBC ESP-AUTH-MD5
      SA duration (kilobytes/sec): 1843200/3600
      SA remaining duration (kilobytes/sec): 1843196/3469
      Max sent sequence-number: 30
      UDP encapsulation used for NAT traversal: N
      Status: Active

```

改用 GRE over IPsec 后，抓包能看到外层源 IP、目的 IP 和 ESP，受保护的内层内容无法直接解读。

![image-20200821154504018](https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/snd/image-20200821154504018.png)
