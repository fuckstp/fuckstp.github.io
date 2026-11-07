---
layout: post
title: "Nexus vPC in EVE-NG"
subtitle: "Build a vPC pair and verify the downstream port channel."
date: 2020-04-26
author: i9u
header-img: img/post-bg-2015.jpg
catalog: true
lang: en
hide_nav: true
translation_key: nexus-vpc-eve-ng
translation_zh: /2020/04/26/%E4%BD%BF%E7%94%A8EVE%E5%AE%9E%E7%8E%B0Nexus-vPC-%E5%8A%9F%E8%83%BD/
translation_en: /en/2020/04/26/nexus-vpc-eve-ng/
permalink: /en/2020/04/26/nexus-vpc-eve-ng/
---

## Nexus vPC in EVE-NG

This lab builds a vPC pair and connects a downstream switch to both peers.

## 1. Overview

Cisco Nexus vPC lets a downstream device use one port channel across two physical switches. The Nexus switches keep separate control planes. This lab allocated 4 GB of RAM to each NX-OS virtual switch. A host with at least 16 GB was recommended for this setup. Check the requirements for the image in use.

## 2. Lab environment

Use EVE-NG Community Edition. [Download EVE-NG](https://t.co/uCYLdYerhL?amp=1)

## 3. Lab images

- Cisco NX-OSv 9k-7.0.3.17.4
- i86bi_linux_l2-adventerprisek9-ms.SS

The original lab notes include an [image reference](http://www.emulatedlab.com/forum.php?mod=viewthread&tid=90). Use images you are licensed to run.

## 4. Topology

![vpc topology](https://kdrdya.bn.files.1drv.com/y4mfKsPsBA3HhpZ7-0x9TFqqST4ME9AEPEXrI0TbcqAKmowXtMpdmpSK2KIOAtBy6HYughD_nN7Mwlv58lZk598g_tN9kQSFEfcstqGQAs4EcsYO_aqyKumR2bJjn39p_uELdhgrwMMJAeA6sdosUOqDX1z0y4C69pN67QHfKpdwPNgle5JJgQL4rX1QBYliawTFTxmsspR0hZjEaF9dvo-gw/vpc%20topo.png?psid=1 "vpc topology")

## 5. Link roles

1. The directly connected Mgmt0 ports carry peer keepalives. These messages help each peer check whether the other is alive.
2. Ethernet1/2 and Ethernet1/3 form the peer link. The peers use it to sync state and carry traffic that needs to cross between them.
3. Ethernet1/4 and Ethernet1/5 are vPC member ports toward the downstream switch.
4. The member port channel uses static mode, and the peer link uses LACP. Match the settings at both ends. Static mode does not negotiate membership or detect a bad cable layout.

## 6. Configuration steps

1. Address and enable the management ports.
2. Create the vPC domain and set the peer keepalive source and destination.
3. Add Ethernet1/2 and Ethernet1/3 to port channel 20 and configure it as the vPC peer link.
4. Add Ethernet1/4 and Ethernet1/5 to port channel 2 and assign vPC ID 21.

Create VLANs 10, 20, and 30 on both Nexus peers and the downstream switch. Verify that the peer link carries those VLANs and that the physical interfaces and port channels are up. An allowed VLAN list does not create the VLANs.

## 7. Configuration

```
N9K-1
feature vPC
feature lacp

interface mgmt0
  vrf member management
  ip address 100.1.1.1/24

vPC domain 7
  role priority 1
  peer-keepalive destination 100.1.1.2 source 100.1.1.1

interface port-channel20
  switchport mode trunk
  vPC peer-link

interface Ethernet1/2
  switchport mode trunk
  channel-group 20 mode active

interface Ethernet1/3
  switchport mode trunk
  channel-group 20 mode active

interface port-channel2
  switchport mode trunk
  switchport trunk allowed vlan 1,10,20,30
  vPC 21

interface Ethernet1/4
  switchport mode trunk
  switchport trunk allowed vlan 1,10,20,30
  channel-group 2

interface Ethernet1/5
  switchport mode trunk
  switchport trunk allowed vlan 1,10,20,30
  channel-group 2

```
```
N9K-2
feature vPC
feature lacp

interface mgmt0
  vrf member management
  ip address 100.1.1.2/24

vPC domain 7
  peer-keepalive destination 100.1.1.1 source 100.1.1.2

interface port-channel20
  switchport mode trunk
  vPC peer-link

interface Ethernet1/2
  switchport mode trunk
  channel-group 20 mode active

interface Ethernet1/3
  switchport mode trunk
  channel-group 20 mode active

interface port-channel2
  switchport mode trunk
  switchport trunk allowed vlan 1,10,20,30
  vPC 21

interface Ethernet1/4
  switchport mode trunk
  switchport trunk allowed vlan 1,10,20,30
  channel-group 2

interface Ethernet1/5
  switchport mode trunk
  switchport trunk allowed vlan 1,10,20,30
  channel-group 2

```
```
SW

interface range Ethernet0/0-3
 switchport trunk allowed vlan 1,10,20,30
 switchport trunk encapsulation dot1q
 switchport mode trunk
 channel-group 2 mode on

interface Port-channel2
 switchport trunk allowed vlan 1,10,20,30
 switchport trunk encapsulation dot1q
 switchport mode trunk
```

## 8. Verify the configuration

```
使用
show vpc brief
or
show vpc consistency-parameters interface port-channel 2
来检查配置的结果
```
![vpc brief](https://lnrdya.bn.files.1drv.com/y4mtfj1us5xAOZc_rbc-VaAEI--NU5EV4051LpQQy08MCyK_NTrLdBupXUJGv4HLMW9qOEMhUMn1dTtfRBF4zbV2IG4Uzv0tq2ZsVaeOoCNfiVqR7ahpu3MAsBI8rZG9BPJ-9bU6He-7pFh2s3hbXOmMqQLC10b3RwBnXb70cO7_yeFd2vueVT9F0rmQ0myTM-pEIwy59r3697S9EqYlwzfcA/vpc-brief.png?psid=1 "vpc brief")

```
使用
show vpc consistency-parameters global
可以用来检查配置一致性是否正确
```
![vpc-con-par](https://k9rdya.bn.files.1drv.com/y4mGBFhgMM6BOHNgvZUakhWzl4xRkhXowlAmxwjRGyq1CXkcBBoUgLerxCDp0VwFlhoZKeLuqZa2f0ZVvzU7W1Yxg7IqcMI_ThDNkjcMFE4KLt_TvqBDkdjwbRjMFH7sBF_MP9X0HyyyxZB152xRMykt29rqqwF9V661mMGtghXdRf9VkFd-MO1W52OI6fZSbe2FTYWSaJmzTO2wxpuHzhI8Q/vpc-con-vpc.png?psid=1 "vpc-con-par")

Check vPC state and consistency on N9K-2 as well.

![n9k-2-vpcbrief](https://ntrdya.bn.files.1drv.com/y4m-kU1iUUrHhz0nwC6LwMpgHL7SBUOJToJB_k23fG0dhAJ17WhUZRDyYTcJsMLtXn76nHh86LkLvsYi1rrMKFinWjFo793eLmEfXRZnAy6HmSFHFWeLUgWbyLpBTK69O5RTvQo636H_5tagbXE2E2jFPI3af1x0-Cdu5qEl-013eH2LVU1Z4zH5KW9BxRqjb2K0a7x-t0tJXHirxjkNR0bNw/n9k-2.png?psid=1 "n9k-2-vpcbrief")

![n9k-2-vpc-con-vpc](https://ndrdya.bn.files.1drv.com/y4mr4y3l6-SYGtTIx4WUSwG5k_xg1_GHU5gAV8yH5A38UQIVbW1WpeiBn1uqcvXycrfe7oeJDC-R10dA0E9TFEbG_sL-zAZUvQDYpsKW5rQrZNqd20b6Qq3qEjGu1VRw7sm14kKTUaEsfCGuwtOR7SD3Ch-7BU5KTQtH4UdBzLN6r5KSZNiG_M1GlOZKzK59UpmyNPMWpuAGPLRmft9MgVReQ/n9k-2-vpc-con-vpc.png?psid=1 "n9k-2-vpc-con-vpc")

On the downstream switch, check that the port channel shows SU. S means Layer 2 and U means in use. Verify that the member ports joined the bundle. On both Nexus switches, check peer adjacency, peer-link state, vPC state, and consistency.

```
show etherchan sum
```
![sw](https://ltpepq.bn.files.1drv.com/y4mDUbZHhOpsjoCxCBhuaKf23jD7X9Nf2mw0t44Gk1d3H58dMoHo1Kb0i6AXWVTE7tNZIbl0imOGATdSe_rcYRpjlMaqVY_u_YieVCM0Y8INpjlLvMPM3CsPPP95x7DvRDKwWkx_7b5oNaxor5XIzpviVjRwMbZEm4Oq5khc05fIDEsb9eAwkl6yA0CfTush65hnQub8uEEh4resTYp8beZuA/sw.png?psid=1 "sw")

## 9. Lab results

The full topology worked in EVE-NG. In the recorded lab, the port channel did not come up with one downstream link to each peer. The peer keepalive also failed when the management ports were not directly connected.

Those results reflect the lab image and configuration. A vPC can use one downstream link per peer. The keepalive needs Layer 3 reachability in its VRF and should have a path independent of the peer link. The original logs would be needed to identify the cause of either failure.

