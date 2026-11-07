---
layout: post
title: "Inter-AS MPLS VPN Option C in EVE-NG"
subtitle: "Follow VPNv4 routes and transport labels across two provider ASes."
date: 2020-04-29
author: i9u
header-img: img/home-bg-art1.jpg
catalog: true
lang: en
hide_nav: true
translation_key: mpls-vpn-option-c
translation_zh: /2020/04/29/%E4%BD%BF%E7%94%A8EVE-NG%E5%AE%9E%E7%8E%B0MPLS-VPN-Option-C%E6%96%B9%E6%A1%88/
translation_en: /en/2020/04/29/mpls-vpn-option-c/
permalink: /en/2020/04/29/mpls-vpn-option-c/
---

## Inter-AS MPLS VPN Option C in EVE-NG

The lab connects two provider autonomous systems and carries customer routes across both.

## 1. Overview

Option C separates VPN route exchange from transport label exchange. The PE routers exchange VPNv4 routes. The ASBRs connect the label paths that reach the remote PEs. See [RFC 4364, Section 10](https://www.rfc-editor.org/rfc/rfc4364#section-10).

## 2. Lab environment

Use EVE-NG Community Edition. [Download EVE-NG](https://t.co/uCYLdYerhL?amp=1)

## 3. Lab images

The routers run vIOS with IOS 15.7(3)M3. The lab notes include an [image reference](http://www.emulatedlab.com/forum.php?mod=viewthread&tid=90). Use an image you are licensed to run.

## 4. Topology

![topology](https://ktpepq.bn.files.1drv.com/y4mAjWfVtyzYiQmsLlyVp_LHsC_S-iWcxGgbvWm0xptnnD0DVzD7G_muswqq1qtNnHI_jnlSYXDlWhLSpnHe1q-Kc1aI_3g5GR1HBUcwTB6f6wbaykVT5mg5FPZcB5-s7AomgbebeqenKINxUrPn6YxZkGfHEGv-FHXLgi6A2BB7QMAuwV9e71vkCvTmQT0PYvbky1F-SDrIIjzqvSGYQW2tQ/topology.PNG?psid=1)

| Role | Devices | Job |
| --- | --- | --- |
| CE | R1, R8 | Advertise customer routes to the provider. |
| PE | R2, R7 | Keep customer routes in a VRF and exchange VPNv4 routes. |
| P | R3, R6 | Switch MPLS labels in the core. |
| ASBR | R4, R5 | Connect the two provider ASes and exchange labeled infrastructure routes. |

Router names follow their vIOS numbers. Loopback0 on R1 is 1.1.1.1/32, Loopback0 on R2 is 2.2.2.2/32, and so on. The R1–R2 link uses 12.1.1.1/24 and 12.1.1.2/24. The next link follows the same pattern.

Use OSPF process 110 within each provider AS. Use point-to-point OSPF on the core links and Loopback0 as the router ID. The PEs peer with the CEs over eBGP.

## 5. Configuration

### 5.1. Interfaces

Assign interface addresses from the topology. The lab focuses on the routing and label configuration.

### 5.2. IGP and LDP

Enable OSPF for the core links and loopbacks inside each provider AS. Keep the inter-AS link and PE-to-CE links out of the provider IGP. The PE loopbacks need a reachable path before the multihop BGP session can come up.

Enable MPLS on the core links that run LDP. LDP supplies transport labels within each AS. BGP labeled unicast supplies labels across the AS boundary.

```
MPLS 配置
mpls label protocol ldp
mpls ldp router-id Loopback0 force
interface [接口]
 mpls ip
```

### 5.3. VRF

Create the customer VRF on R2 and R7. An RD makes overlapping customer prefixes distinct in VPNv4. A route target controls which VRFs import a VPN route. This lab uses the same RD on both PEs for simplicity. The import and export route targets must match the intended VPN policy.

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

Use eBGP to carry customer routes between each CE and its PE. The PE-to-PE session uses loopbacks, so configure multihop for that session. Text after a hash in the snippets is a note. Remove it before entering commands. Limit redistributed connected routes to the customer prefixes required.

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

The ASBRs R4 and R5 use eBGP labeled unicast to exchange infrastructure routes and labels. This lab redistributes routes between BGP and OSPF. Filter the prefixes in a production design to avoid leaks and feedback loops. The ASBRs do not need the customer VPNv4 routes.

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

R2 and R7 learn customer routes through their VRFs and exchange them over VPNv4 BGP. Matching import and export route targets allow the routes into the correct VRF.

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

### 5.5. Verification

Check the BGP sessions and routing tables.

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

Each CE should learn the remote CE's loopback and attached network.

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

## 6. Test connectivity

Use ping and traceroute between the CEs.

![R8](https://l9pepq.bn.files.1drv.com/y4mrl-kRnggM2GB2hqz0iyWxWylAmQZaHhH9EMCyqHDT0vE7xH5cZMZevijW_9jcjikU6OzFNVl902Jf1odyhm2nF2ZGpTO40VmQK1h7ZDb3KJkyjG25vqhQCt9b182B8joivPikUCXVLMF3Ay_8engL3UFAaBnkyfnHXhRofw1-E1reYUYmNE-T5_EA7kuNGc388AKWbKxev-McTSafTmXCA/ping-R1.PNG?psid=1)

![R1](https://l9pepq.bn.files.1drv.com/y4mMbpWHwlu3YAm_oQWyO-6iRS_A-Fu4dSAaUpAv81Qh5p3jD2peWU00smufqDpmOohNPOjbk1s3Z0eUG7qOwXIiiuepM0prsph59LxOcB-y6U7hdp0527OdifIU4uF2_FLOP94nsVktAL6sXI50OEFMkErNde1T1ICddL_ce2MUIg0j60xJGUzm5Hmu27p6D6ow5YUytNg_XTZq5Zd1lYpZw/ping-R8.PNG?psid=1)

Some hops in the saved trace show two labels. The inner VPN label is 25 in this run. Label values and stack depth can differ in another deployment.

The remote PE allocates the VPN label and advertises it with the VPNv4 route. The transport label follows the path to that remote PE. In this lab, LDP provides labels within each AS, and the ASBRs use BGP to connect the two paths.

From R1, the next hop to 8.8.8.8 is R2. From R2's VPNv4 table, the remote PE next hop is 7.7.7.7. Check both the VPNv4 route and the transport label path when troubleshooting Option C.

