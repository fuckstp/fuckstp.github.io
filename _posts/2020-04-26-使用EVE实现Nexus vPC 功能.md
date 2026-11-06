---
layout:     post   				    
title:      使用EVE实现Nexus vPC 功能 
subtitle:   模拟 NX-OS的内存要求有点高
date:       2020-04-26
author:     i9u 						
header-img: img/post-bg-2015.jpg 	
catalog: true 						
tags:								
    - EVE-NG
---

## 使用EVE实现Nexus vPC 功能
> 这是我的第一篇博客。

## 1. 前言
vPC是Cisco Nexus上让两台独立交换机对下游呈现一个port channel的技术，两台设备仍保留各自的控制平面，当然我想看这篇文章的人也相当清楚这个技术的原理和应用场景。使用EVE来做这个实验是不错的选择，前提是你的电脑内存要十分充足，这次使用的NX-OS镜像每台分配了4G内存，整台电脑建议至少16G；换镜像版本后，要重新确认它的资源要求。

## 2. 实验环境
1. 模拟器 EVE-NG 社区版
 [下载地址](https://t.co/uCYLdYerhL?amp=1 "下载地址")

## 3. 镜像
1. Cisco NX-OSv 9k-7.0.3.17.4
2. i86bi_linux_l2-adventerprisek9-ms.SS

镜像资源可以从这搜寻，按需下载并导入：
[链接](http://www.emulatedlab.com/forum.php?mod=viewthread&tid=90 "链接")

## 4. 拓扑图
![vpc topology](https://kdrdya.bn.files.1drv.com/y4mfKsPsBA3HhpZ7-0x9TFqqST4ME9AEPEXrI0TbcqAKmowXtMpdmpSK2KIOAtBy6HYughD_nN7Mwlv58lZk598g_tN9kQSFEfcstqGQAs4EcsYO_aqyKumR2bJjn39p_uELdhgrwMMJAeA6sdosUOqDX1z0y4C69pN67QHfKpdwPNgle5JJgQL4rX1QBYliawTFTxmsspR0hZjEaF9dvo-gw/vpc%20topo.png?psid=1 "vpc topology")

## 5. 简单描述
1. 这次用 Mgmt 0 口直连做 peer-keepalive，检测对端是否存活。
2. E1/2-3作为vPC peer-link，用于同步状态，并承载需要在两台peer之间转发的流量。
3. E1/4-5 属于 vPC member port，用于连接下挂的交换机。
4. 这里的 member port 用静态 `on` 模式，peer-link 则使用 LACP。 两端的聚合方式要匹配，静态 `on` 不会帮你检查接线和协商成员关系，复现时要留意。

## 6. 配置步骤
1. 给mgmt口配置ip，并开启
2. 划分vpc domain，配置peer-keepalive 目的ip和源ip
3. 创建port-channel 20，并将E1/2-3划入port-channel 20，配置vpc peer-link
4. 创建 `port-channel 2`，将 E1/4-5 加入该聚合口，再配置 `vpc 21`

这里贴的是关键配置。复现前还要在两台N9K和下游SW创建用到的VLAN 10、20、30，确认peer-link允许这些VLAN通过，并检查物理口与聚合口没有被shutdown。只配置 `switchport trunk allowed vlan` 并不会创建VLAN。

## 7. 配置

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
## 8. 验证配置
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

同样在N9K-2 上查看 vPC 状态和一致性参数：
![n9k-2-vpcbrief](https://ntrdya.bn.files.1drv.com/y4m-kU1iUUrHhz0nwC6LwMpgHL7SBUOJToJB_k23fG0dhAJ17WhUZRDyYTcJsMLtXn76nHh86LkLvsYi1rrMKFinWjFo793eLmEfXRZnAy6HmSFHFWeLUgWbyLpBTK69O5RTvQo636H_5tagbXE2E2jFPI3af1x0-Cdu5qEl-013eH2LVU1Z4zH5KW9BxRqjb2K0a7x-t0tJXHirxjkNR0bNw/n9k-2.png?psid=1 "n9k-2-vpcbrief")

![n9k-2-vpc-con-vpc](https://ndrdya.bn.files.1drv.com/y4mr4y3l6-SYGtTIx4WUSwG5k_xg1_GHU5gAV8yH5A38UQIVbW1WpeiBn1uqcvXycrfe7oeJDC-R10dA0E9TFEbG_sL-zAZUvQDYpsKW5rQrZNqd20b6Qq3qEjGu1VRw7sm14kKTUaEsfCGuwtOR7SD3Ch-7BU5KTQtH4UdBzLN6r5KSZNiG_M1GlOZKzK59UpmyNPMWpuAGPLRmft9MgVReQ/n9k-2-vpc-con-vpc.png?psid=1 "n9k-2-vpc-con-vpc")

查看下挂的SW交换机port-channel 状态是否为“SU”。`S` 表示二层，`U` 表示正在使用；还要检查成员口是否正常加入聚合，并确认两台N9K的peer邻接、peer-link、vPC状态和一致性检查正常。
```
show etherchan sum
```
![sw](https://ltpepq.bn.files.1drv.com/y4mDUbZHhOpsjoCxCBhuaKf23jD7X9Nf2mw0t44Gk1d3H58dMoHo1Kb0i6AXWVTE7tNZIbl0imOGATdSe_rcYRpjlMaqVY_u_YieVCM0Y8INpjlLvMPM3CsPPP95x7DvRDKwWkx_7b5oNaxor5XIzpviVjRwMbZEm4Oq5khc05fIDEsb9eAwkl6yA0CfTush65hnQub8uEEh4resTYp8beZuA/sw.png?psid=1 "sw")

## 9. 最后
EVE可以成功模拟出vPC的效果，同时不会有报错，但是我尝试的过程中发现如果和下挂的SW交换机各使用1条链路进行捆绑时，会一直起不来。并且如果不是使用直连的mgmt口作为peer-keepalive的话，peer检测也会起不来。

这两个现象是我当时在这套镜像和配置中遇到的，还不能当作vPC本身的限制。vPC可以让下游分别用一条链路连接两台peer，peer-keepalive也不要求mgmt口直连，只要所用VRF中的三层路径可达，并避免依赖peer-link。至于这次为什么起不来，还需要结合当时的日志和配置排查。
