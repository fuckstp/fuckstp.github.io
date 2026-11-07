---
layout: post
title: "What Is Software-Defined Networking?"
subtitle: "How programmable control and network overlays work together."
date: 2020-08-11
author: i9u
header-img: img/Ec5R55jWkAAssjO-min.png
catalog: true
lang: en
hide_nav: true
translation_key: what-is-sdn
translation_zh: /2020/08/11/%E4%BB%80%E4%B9%88%E6%98%AFSDN/
translation_en: /en/2020/08/11/what-is-sdn/
permalink: /en/2020/08/11/what-is-sdn/
---

## What is SDN?

This article is a reading note based on *Next-Generation SDN: VMware NSX Network Principles and Practice*. Product examples describe the period covered by the book.

Software-defined networking (SDN) separates decisions about traffic from the work of forwarding it. Software interfaces let applications and operators query the network or change its behavior. Control can be logically central even when several controllers share the work.

OpenFlow is one way for a controller to program forwarding. An SDN design can use other interfaces. Network virtualization solves a related problem by building logical networks on shared infrastructure. An overlay can carry Layer 2 traffic across a Layer 3 network, with encapsulation on a physical switch or a virtual switch.

Network functions virtualization (NFV) runs functions such as routers and firewalls as software on standard hardware. SDN can help control those functions. OpenStack and CloudStack manage cloud infrastructure. Open vSwitch can act as a forwarding component and exposes interfaces such as OpenFlow and OVSDB.

## The SDN architecture

<img src="https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/sdn/image-20200811110949644.png" alt="image-20200811110949644" style="zoom:80%;" />

- **Infrastructure:** Physical and virtual devices forward traffic.
- **Southbound interface:** The controller communicates with forwarding devices. OpenFlow is one example.
- **Control layer:** One controller or a group of controllers applies the network's control logic.
- **Northbound interface:** Applications query state or request policy changes through an API.
- **Application layer:** Tools such as monitoring or operations platforms use the controller to read state or deploy changes.

## Standards groups and vendors

> The comparisons in this section reflect the historical context of the book. Membership and product capabilities change over time.

The Open Networking Foundation (ONF), founded in 2011, worked on standards such as OpenFlow and OF-Config. OpenDaylight (ODL), launched in 2013, brought vendors together around an open-source controller platform.

<img src="https://cdn.jsdelivr.net/gh/fuckstp/fuckstp.github.io@master/img/sdn/image-20200811111129437.png" alt="image-20200811111129437" style="zoom:80%;" />

Some vendors participated in both efforts. Products often combined programmable interfaces with existing forwarding and vendor features. Interfaces and hardware choices varied across products, including OpenFlow, other APIs, merchant silicon, and custom chips.

The same period saw VMware build NSX after acquiring Nicira, Cisco develop ACI, and Juniper introduce Contrail after acquiring the company behind it. Microsoft's Hyper-V network virtualization took a different approach with NVGRE.

## Server virtualization

Server virtualization made it possible to run many workloads on one host and move them between hosts. VMware helped bring x86 virtualization into widespread use. Hyper-V, XenServer, and KVM offered other approaches. As compute became easier to move, the network needed ways to keep a workload reachable after a move.

## Why network virtualization developed

Three pressures helped drive overlay adoption:

1. **Workload mobility.** A workload may need to keep its IP address and reachability when moved. The migration traffic can travel over Layer 3, while the workload's network still needs a suitable address and gateway design.
2. **MAC table capacity.** A large Layer 2 domain can require physical switches to learn many workload MAC addresses. An overlay shifts much of that state to its tunnel endpoints. Those endpoints still have their own capacity limits.
3. **Tenant isolation.** The 12-bit VLAN ID space has roughly four thousand usable IDs. Large multi-tenant networks may need a larger logical identifier space.

The physical network is the underlay. It carries packets between tunnel endpoints. The overlay adds a header so a logical network can span the underlay. The underlay needs reachability, enough MTU for the extra headers, and any protocol support the chosen design requires.

Earlier approaches included EtherIP, H3C EVI, and Cisco OTV. Some focused on extending Layer 2 between sites. The same broad idea can be applied at different points: between physical switches, between virtual switches, or between a mix of the two.

VXLAN carries Ethernet frames over an IP network and can use equal-cost paths in the underlay. Its 24-bit VNI gives it a much larger identifier space than VLANs. Actual scale depends on endpoint resources and implementation. [RFC 7348](https://www.rfc-editor.org/rfc/rfc7348)

Nexus 1000V was one early distributed virtual switch. Nicira's NVP used Open vSwitch, centralized control, and overlay tunnels to separate logical networks from physical location. That separation lets policies follow workloads as their placement changes. VMware acquired Nicira in 2012 and introduced NSX in 2013.

## Summary

- SDN exposes programmable control over forwarding.
- OpenFlow is one southbound protocol. Other interfaces can serve the same role.
- An overlay creates logical networks over a shared underlay.
- SDN and network virtualization can work together to deploy policy and manage workloads at scale.

