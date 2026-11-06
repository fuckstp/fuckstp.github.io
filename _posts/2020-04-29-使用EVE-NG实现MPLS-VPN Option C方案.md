---
layout:     post
title:      使用EVE-NG实现MPLS-VPN Option C方案
subtitle:   没你想象的复杂，重点是Send-labels特性。
date:       2020-04-29
author:     i9u
header-img: img/home-bg-art1.jpg
catalog: true
tags:
    - EVE-NG
    - MPLS-VPN
---

## 使用EVE-NG实现MPLS-VPN Option C 方案
> 起因是读《Segment Routing 卷一》时，看到 MPLS-BGP 控制平面有点糊涂了，大概是考完试就没有碰MPLS的原因，把大部分的理论都忘光光，然后把Option A、B、C重新复习了一遍。

## 1. 前言
MPLS-VPN Option C 方案的优缺点这里就不提了，直接在实验里回顾一下 MPLS 和跨域转发的过程。

## 2. 实验环境
1. 模拟器 EVE-NG社区版 （[下载地址](https://t.co/uCYLdYerhL?amp=1 "下载地址")）

## 3. 镜像
1. vios-adventerprisek9-m
2. 镜像系统版本Version 15.7(3)M3, RELEASE SOFTWARE (fc2)

镜像资源可以从这搜寻，按需下载并导入：[链接](http://www.emulatedlab.com/forum.php?mod=viewthread&tid=90 "链接")

## 4. 拓扑图

![topology](https://ktpepq.bn.files.1drv.com/y4mAjWfVtyzYiQmsLlyVp_LHsC_S-iWcxGgbvWm0xptnnD0DVzD7G_muswqq1qtNnHI_jnlSYXDlWhLSpnHe1q-Kc1aI_3g5GR1HBUcwTB6f6wbaykVT5mg5FPZcB5-s7AomgbebeqenKINxUrPn6YxZkGfHEGv-FHXLgi6A2BB7QMAuwV9e71vkCvTmQT0PYvbky1F-SDrIIjzqvSGYQW2tQ/topology.PNG?psid=1)

说明

角色定义

PE：每个AS域内与外部客户所连接的路由器，例如vIOS2、vIOS7；

P：核心路由器，负责MPLS标签转发，但不需要维护客户的VPN路由，例如vIOS3、vIOS6；

ASBR：和其他AS域互联的路由器，例如vIOS4、vIOS5

CE：代表客户的路由器，例如vIOS1、vIOS8；

接口及命名规则

每个vIOS（路由器）采用R+数字的命名方法，即vIOS1=R1、vIOS2=R2，以此类推；

每个路由器建立loopback 0接口，并且ip格式为1.1.1.1/32，R2即2.2.2.2/32，以此类推；

每个路由器互联接口的 IP 地址根据路由器编号来分配，即R1和R2互联地址是12.1.1.1/24和12.1.1.2/24，R2和R3的互联地址为23.1.1.2/24和23.1.1.3/24，以此类推。

路由设定

每个AS域内启用OSPF并且进程号为110，互联接口设定成PTP模式，使用loopback 0 作为router-id；

而与CE路由器则使用EBGP互联。

## 5. 配置过程

### 5.1. 接口

这里略过

### 5.2. IGP/LDP

这里也略过，毕竟都谈到Option C了，BGP运行在TCP之上，建立邻居之前先要保证对等体地址可达；这里用IGP来打通，也可以根据场景使用直连或静态路由，这一点你该不会不知道吧。

所以这里就给每个AS内参与骨干转发的路由器建立OSPF邻居，并且把环回口、互联口宣告进OSPF进程，但是不需要把两个AS之间的互联口、PE连接CE的接口也宣告进OSPF。

这里在AS内部使用LDP分发传输标签，所以需要在参与LDP的核心互联接口上启用 `mpls ip`。MPLS本身并不限定必须使用LDP，后面ASBR之间使用的是BGP标签分发。

```
MPLS 配置
mpls label protocol ldp
mpls ldp router-id Loopback0 force
interface [接口]
 mpls ip
```

### 5.3. VRF

两台PE需要建立VRF来接收CE发过来的路由。fuckstp是VRF的名字，客户IPv4路由保存在对应VRF里，导出时结合RD形成VPNv4路由，并携带VPN标签和RT。RD用来区分可能重叠的IPv4前缀，RT决定路由能被哪些VRF导入。这里两端使用相同的RD和RT来简化实验，但同一个VPN不要求各PE使用相同RD，关键是RT的导入、导出策略匹配。

VRF 配置（两台PE R2\R7 配置均一样）

```
vrf definition fuckstp
 rd 10:10
 !
 address-family ipv4
  route-target export 10:10
  route-target import 10:10
 exit-address-family
!
将接口划入VRF，配置后会删除接口下的所有配置，所以需要重新配置一下。
interface GigabitEthernet0/0
 vrf forwarding fuckstp
!
```

### 5.4. BGP

CE需要发送路由到PE，可以选择静态路由、IGP 或 BGP，这里选用BGP来和PE建立邻居发送路由

下面命令里的 `#中文说明` 是文章注释，输入设备前要删除。两台PE使用Loopback建立非直连eBGP邻居，所以需要 `ebgp-multihop`；不是所有跨AS邻居都要配它。CE用 `redistribute connected` 是这里的简化写法，实际要控制只发布需要的客户前缀。

```
R1
router bgp 10
 bgp router-id 1.1.1.1
 redistribute connected 
 neighbor 12.1.1.2 remote-as 100
 R8
 router bgp 20
 bgp router-id 8.8.8.8
 redistribute connected
 neighbor 78.1.1.7 remote-as 200
 
#我偷懒将所有直连路由重分发进入BGP，正常应该选择network进行宣告或则重分发IGP路由。
```

AS100/200中的ASBR路由器（R4、R5）建立eBGP邻居，并用 `send-label` 交换到远端PE等基础设施前缀的标签信息。这个实验通过BGP和OSPF重分发实现跨AS可达，但并不要求把所有路由都双向倒进去；实际使用时应过滤前缀，避免无关路由泄漏和重分发回灌。VPNv4路由由PE之间交换，ASBR主要负责把传输标签路径接起来。

```
R4
router ospf 110
 router-id 4.4.4.4
 redistribute bgp 100 subnets#重分发路由进入OSPF记得要加subnets参数
!
router bgp 100
 bgp router-id 4.4.4.4
 neighbor 45.1.1.5 remote-as 200
 !
 address-family ipv4
  redistribute ospf 110 match internal external 1 external 2
  neighbor 45.1.1.5 activate
  neighbor 45.1.1.5 send-label#为BGP路由分发标签
 exit-address-family
 ////////////////////////////
 R5
 router ospf 110
 router-id 5.5.5.5
 redistribute bgp 200 subnets#重分发路由进入OSPF记得要加subnets参数
!
router bgp 200
 bgp router-id 5.5.5.5
 neighbor 45.1.1.4 remote-as 100
 !
 address-family ipv4
  redistribute ospf 110 match internal external 1 external 2
  neighbor 45.1.1.4 activate
  neighbor 45.1.1.4 send-label#为BGP路由分发标签
 exit-address-family
```

PE路由器（R2、R7）先和CE路由器（R1、R8）建立基于 VRF 的 eBGP 邻居，接收客户发过来的路由，再互相建立VPNv4邻居来发送VPNv4路由，通过RT（Route Target）控制远端VRF是否导入这些路由，该例子中两端使用匹配的RT导入、导出配置。

```Cisco
R2
router bgp 100
 bgp router-id 2.2.2.2
 neighbor 7.7.7.7 remote-as 200
 neighbor 7.7.7.7 ebgp-multihop 255#因为跨域所以需要配置该参数
 neighbor 7.7.7.7 update-source Loopback0
 !
 address-family vpnv4
  neighbor 7.7.7.7 activate
  neighbor 7.7.7.7 send-community extended
 exit-address-family
 !
 address-family ipv4 vrf fuckstp
  neighbor 12.1.1.1 remote-as 10
  neighbor 12.1.1.1 activate
 exit-address-family
 ///////////////////
R7
router bgp 200
 bgp router-id 7.7.7.7
 neighbor 2.2.2.2 remote-as 100#因为跨域所以需要配置该参数
 neighbor 2.2.2.2 ebgp-multihop 255
 neighbor 2.2.2.2 update-source Loopback0
 !
 address-family vpnv4
  neighbor 2.2.2.2 activate
  neighbor 2.2.2.2 send-community extended
 exit-address-family
 !
 address-family ipv4 vrf fuckstp
  neighbor 78.1.1.8 remote-as 20
  neighbor 78.1.1.8 activate
 exit-address-family
```

### 5.5. 验证配置

使用下面的命令来验证邻居是否建立成功、路由表是否有路由

```Cisco
show bgp vpnv4 unicast all summary

R2
BGP router identifier 2.2.2.2, local AS number 100
BGP table version is 7, main routing table version 7
4 network entries using 624 bytes of memory
4 path entries using 336 bytes of memory
3/2 BGP path/bestpath attribute entries using 504 bytes of memory
2 BGP AS-PATH entries using 48 bytes of memory
1 BGP extended community entries using 24 bytes of memory
0 BGP route-map cache entries using 0 bytes of memory
0 BGP filter-list cache entries using 0 bytes of memory
BGP using 1536 total bytes of memory
BGP activity 4/0 prefixes, 4/0 paths, scan interval 60 secs

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
7.7.7.7         4          200     266     264        7    0    0 03:57:11        2
12.1.1.1        4           10     264     264        7    0    0 03:58:09        2

如果你的配置没错，那么返回结果就如上，建立的7.7.7.7是对方AS内的PE路由，而12.1.1.1则是CE的eBGP路由邻居，相反R7也应该如此。

show bgp vpnv4 uni vrf fuckstp #查看vrf fuckstp下的vpnv4路由表
R2
BGP table version is 7, local router ID is 2.2.2.2
Status codes: s suppressed, d damped, h history, * valid, > best, i - internal, 
              r RIB-failure, S Stale, m multipath, b backup-path, f RT-Filter, 
              x best-external, a additional-path, c RIB-compressed, 
              t secondary path, 
Origin codes: i - IGP, e - EGP, ? - incomplete
RPKI validation codes: V valid, I invalid, N Not found

     Network          Next Hop            Metric LocPrf Weight Path
Route Distinguisher: 10:10 (default for vrf fuckstp)
 *>   1.1.1.1/32       12.1.1.1                 0             0 10 ?
 *>   8.8.8.8/32       7.7.7.7                                0 200 20 ?
 r>   12.1.1.0/24      12.1.1.1                 0             0 10 ?
 *>   78.1.1.0/24      7.7.7.7                                0 200 20 ?

你可以看到路由表内装有R8的环回口路由，因为我们刚刚在R8上直接redistribution connect，会把环回口也包括在内分发到BGP，并且通过vpnv4发送到R2上，相反R7也应该如此。
```

再来看看两个CE是否收到了对方的路由，细心的可以留意到双方都有对方的环回口路由和出口路由。

```
R1
R1#show ip route 
Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area 
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2
       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
       ia - IS-IS inter area, * - candidate default, U - per-user static route
       o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP
       a - application route
       + - replicated route, % - next hop override, p - overrides from PfR

Gateway of last resort is not set

      1.0.0.0/32 is subnetted, 1 subnets
C        1.1.1.1 is directly connected, Loopback0
      8.0.0.0/32 is subnetted, 1 subnets
B        8.8.8.8 [20/0] via 12.1.1.2, 04:02:30
      12.0.0.0/8 is variably subnetted, 2 subnets, 2 masks
C        12.1.1.0/24 is directly connected, GigabitEthernet0/0
L        12.1.1.1/32 is directly connected, GigabitEthernet0/0
      78.0.0.0/24 is subnetted, 1 subnets
B        78.1.1.0 [20/0] via 12.1.1.2, 04:02:30
/////////
R8#show ip rou
Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area 
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2
       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
       ia - IS-IS inter area, * - candidate default, U - per-user static route
       o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP
       a - application route
       + - replicated route, % - next hop override, p - overrides from PfR

Gateway of last resort is not set

      1.0.0.0/32 is subnetted, 1 subnets
B        1.1.1.1 [20/0] via 78.1.1.7, 04:03:08
      8.0.0.0/32 is subnetted, 1 subnets
C        8.8.8.8 is directly connected, Loopback0
      12.0.0.0/24 is subnetted, 1 subnets
B        12.1.1.0 [20/0] via 78.1.1.7, 04:03:08
      78.0.0.0/8 is variably subnetted, 2 subnets, 2 masks
C        78.1.1.0/24 is directly connected, GigabitEthernet0/0
L        78.1.1.8/32 is directly connected, GigabitEthernet0/0
```

## 6. 测试连通性

Ping和tracert一下~

![R8](https://l9pepq.bn.files.1drv.com/y4mrl-kRnggM2GB2hqz0iyWxWylAmQZaHhH9EMCyqHDT0vE7xH5cZMZevijW_9jcjikU6OzFNVl902Jf1odyhm2nF2ZGpTO40VmQK1h7ZDb3KJkyjG25vqhQCt9b182B8joivPikUCXVLMF3Ay_8engL3UFAaBnkyfnHXhRofw1-E1reYUYmNE-T5_EA7kuNGc388AKWbKxev-McTSafTmXCA/ping-R1.PNG?psid=1)

![R1](https://l9pepq.bn.files.1drv.com/y4mMbpWHwlu3YAm_oQWyO-6iRS_A-Fu4dSAaUpAv81Qh5p3jD2peWU00smufqDpmOohNPOjbk1s3Z0eUG7qOwXIiiuepM0prsph59LxOcB-y6U7hdp0527OdifIU4uF2_FLOP94nsVktAL6sXI50OEFMkErNde1T1ICddL_ce2MUIg0j60xJGUzm5Hmu27p6D6ow5YUytNg_XTZq5Zd1lYpZw/ping-R8.PNG?psid=1)

从图中的traceroute结果可以看到，部分跳上显示了双层标签，内层标签是“25”。这个数值属于当时的实验结果，重建实验后不一定相同，Option C的标签层数也不固定为两层。

标签的分配（入口PE R2视角）：

1. 内层VPN标签由对端PE分配，并通过VPNv4路由通告给入口PE。
2. 外层传输标签要按照到远端PE的标签路径来压入或交换，AS内部这里使用LDP，跨AS的标签信息由ASBR之间的BGP labeled-unicast传递。

这里要分清下一跳的视角：R1作为CE，去往8.8.8.8的下一跳是本地PE R2；从R2收到的VPNv4路由看，远端PE下一跳才是7.7.7.7。`send-label` 用于通告BGP前缀及其标签绑定，配合域内标签转发形成端到端LSP。

我希望这样表述能让你看懂，Option C的重点就是两件事：PE之间交换VPNv4路由，ASBR之间接通到远端PE的标签路径。只有IP可达还不够，转发时对应的标签也得接得上。
