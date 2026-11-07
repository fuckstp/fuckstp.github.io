---
layout: post
title: "VTP: How Cisco Switches Share VLANs"
subtitle: "2021 is almost here, and I'm still looking for my next job."
date: 2021-01-07
author: i9u
header-img: img/EiAbsj4UwAADTNF.jpeg
catalog: true
lang: en
hide_nav: true
translation_key: vtp
translation_zh: /2021/01/07/VTP/
translation_en: /en/2021/01/07/vtp/
permalink: /en/2021/01/07/vtp/
tags:
    - layer 2
    - Networking Basics
---

## Introduction

VTP stands for VLAN Trunking Protocol. Cisco switches use it to share VLAN information over trunk links. If I need the same VLAN on many switches, creating it once sounds a lot easier than making the same change on every switch.

That convenience works both ways. A VLAN deletion can spread just as quickly as an addition. I used three switches to see what gets shared and what happens when a switch comes back with a higher revision number.

## VTP modes

I start with three modes: Server, Client, and Transparent. The server can change the shared VLAN database. A client learns that database. A transparent switch keeps its own VLANs.

VTP messages travel over trunks. A VLAN appearing in the database is separate from assigning access ports or allowing that VLAN on a trunk.

### Lab topology

I use SW1 as the server, SW2 as the client, and SW3 in Transparent mode. The links between them are trunks.

![Three-switch VTP lab topology](/img/vtp/image-20210107160318708.png)

### SW1 as the server

SW1 is already in Server mode. I set the domain and lab password to CCIE. Then I check the settings with **show vtp status** and **show vtp password**.

```
Switch(config)#vtp domain CCIE
Changing VTP domain name from NULL to CCIE
*Jan  7 08:06:16.358: %SW_VLAN-6-VTP_DOMAIN_NAME_CHG: VTP domain name changed to CCIE.
Switch(config)#vtp password CCIE
Setting device VTP password to CCIE
Switch(config)#end
Switch#show vtp stat
*Jan  7 08:06:28.596: %SYS-5-CONFIG_I: Configured from console by console
Switch#show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 1
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0700
Configuration last modified by 0.0.0.0 at 1-6-21 07:22:30
Local updater ID is 0.0.0.0 (no valid interface found)

Feature VLAN:
--------------
VTP Operating Mode                : Server
Maximum VLANs supported locally   : 1005
Number of existing VLANs          : 7
Configuration Revision            : 2
MD5 digest                        : 0x14 0x9E 0xBC 0xC0 0x07 0x18 0xAF 0x80 
                                    0x4D 0x83 0x44 0x10 0xB2 0x97 0xED 0xB4 
Switch#show vtp password
VTP Password: CCIE
Switch#
```

### SW2 as the client

I use the same domain and password on SW2 and set it to Client mode.

```
SW2(config)#vtp domain CCIE
Domain name already set to CCIE.
SW2(config)#vtp password CCIE
Setting device VTP password to CCIE
SW2(config)#vtp mode client
Setting device to VTP Client mode for VLANS.
SW2(config)#do show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 1
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0100
Configuration last modified by 0.0.0.0 at 1-6-21 07:22:30

Feature VLAN:
--------------
VTP Operating Mode                : Client
Maximum VLANs supported locally   : 1005
Number of existing VLANs          : 7
Configuration Revision            : 2
MD5 digest                        : 0x14 0x9E 0xBC 0xC0 0x07 0x18 0xAF 0x80 
                                    0x4D 0x83 0x44 0x10 0xB2 0x97 0xED 0xB4 
```

### SW3 in Transparent mode

I use the same lab settings on SW3, but set it to Transparent mode. Look at the VLAN count and revision. They differ from the values on SW1 and SW2.

```
SW3(config)#vtp domain CCIE
Changing VTP domain name from NULL to CCIE
*Jan  7 08:22:43.410: %SW_VLAN-6-VTP_DOMAIN_NAME_CHG: VTP domain name changed to CCIE.
SW3(config)#vtp password CCIE
Setting device VTP password to CCIE
SW3(config)#vtp mode transparent 
Setting device to VTP Transparent mode for VLANS.
SW3(config)#do show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 1
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0200
Configuration last modified by 0.0.0.0 at 0-0-00 00:00:00

Feature VLAN:
--------------
VTP Operating Mode                : Transparent
Maximum VLANs supported locally   : 1005
Number of existing VLANs          : 5
Configuration Revision            : 0
MD5 digest                        : 0x0C 0xF3 0x3A 0x7E 0x13 0x5B 0x17 0x29 
                                    0xEB 0xB1 0x2A 0x4C 0x9D 0x50 0x63 0xF9 
```

### Read the VTP status

| Field | What I look for |
| --- | --- |
| Version capable / version running | This switch supports versions 1 through 3. The lab is running version 1. |
| Domain Name | Switches need to be in the same VTP domain to share their VLAN database. If a password is set, it must match too. |
| Pruning Mode | Whether VTP pruning is enabled. I test it later. |
| Operating Mode | The role the switch is using. |
| Maximum VLANs supported locally | This switch reports a local limit of 1005 in the output above. |
| Number of existing VLANs | How many VLANs are present now, including the defaults. |
| Configuration Revision | The number VTP v1 and v2 use to tell which copy of the database is newer. |

### Check VLAN synchronization

I add VLANs 10, 20, 30, and 1006 on SW1.

```
SW1(config)#vlan 10,20,30,1006
SW1(config-vlan)#vlan 10
SW1(config-vlan)#name blue
SW1(config-vlan)#vlan 20
SW1(config-vlan)#name red
SW1(config-vlan)#vlan 30
SW1(config-vlan)#name green
SW1(config-vlan)#vlan 1006
SW1(config-vlan)#name black
SW1(config-vlan)#exit
SW1(config)#do show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/2, Et0/3
10   blue                             active    Et1/0, Et1/1
20   red                              active    Et1/2, Et1/3
30   green                            active    
1002 fddi-default                     act/unsup 
1003 token-ring-default               act/unsup 
1004 fddinet-default                  act/unsup 
1005 trnet-default                    act/unsup 
1006 black                            active  
SW1(config)#
```

On SW2, I check what the client learned.

```
SW2#show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/1, Et0/2, Et0/3
10   blue                             active    
20   red                              active    
30   green                            active    
1002 fddi-default                     act/unsup 
1003 token-ring-default               act/unsup 
1004 fddinet-default                  act/unsup 
1005 trnet-default                    act/unsup 
SW2#

```

VLANs 10, 20, and 30 appear on SW2. VLAN 1006 is in the extended range, which VTP v1 and v2 do not advertise. SW3 keeps its local database.

```
SW3(config)#do show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/1, Et0/2, Et0/3
1002 fddi-default                     act/unsup 
1003 token-ring-default               act/unsup 
1004 fddinet-default                  act/unsup 
1005 trnet-default                    act/unsup 
SW3(config)#
SW3(config)#
```

### Try a local change on SW2 and SW3

I try to create VLAN 40 on SW2. Client mode rejects the command.

```
SW2(config)#vlan 40
VTP VLAN configuration not allowed when device is in CLIENT mode.
SW2(config)#
```

The same change works on SW3. VLAN 40 stays on SW3 because Transparent mode does not advertise its local VLAN changes.

```
SW3(config)#vlan 40
SW3(config-vlan)#do wr
SW3(config-vlan)#name prue
SW3(config-vlan)#end
SW3#show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/1, Et0/2, Et0/3
40   prue                             active    
1002 fddi-default                     act/unsup 
1003 token-ring-default               act/unsup 
1004 fddinet-default                  act/unsup 
1005 trnet-default                    act/unsup 
```

The saved output below is from SW1. VLAN 40 is absent.

```
SW1(config)#do show vlan br

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/2, Et0/3
10   blue                             active    Et1/0, Et1/1
20   red                              active    Et1/2, Et1/3
30   green                            active    
1002 fddi-default                     act/unsup 
1003 token-ring-default               act/unsup 
1004 fddinet-default                  act/unsup 
1005 trnet-default                    act/unsup 
1006 black   
```

### What each mode does

- **Server:** In v1 and v2, I can create, change, and delete VLANs. A server can also learn updates from the domain.
- **Client:** It can send and receive VTP messages, but I cannot edit its VLAN database locally.
- **Transparent:** I can edit its local VLANs. It does not apply received VLAN updates or advertise its own database. It can still pass received advertisements along a trunk, depending on the version and platform.

## VTP versions

My switches report support for versions 1 through 3, and this lab starts in v1. Check **show vtp status** on your own switch, since defaults and supported features vary.

### What changes between versions

V2 adds Token Ring support and can pass along some fields it does not understand. It also changes how Transparent mode relays messages. Check the behavior on your switch before relying on it across different versions.

V3 can advertise extended-range VLANs and share the MST database as a separate feature. For VLAN changes, it adds a primary server role. That gives me a specific switch to make changes on. See the [Cisco VTP configuration guide](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/vlan/vlan-configuration-guide/configure-vtp.html) for platform details.

### VTP versions 1 and 2

I use **vtp version 2** to switch the lab to v2. SW1 is at revision 5 in the saved output.

```
SW1(config)#vtp version 2
SW1(config)#do show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 2
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0700
Configuration last modified by 0.0.0.0 at 1-7-21 09:15:58
Local updater ID is 0.0.0.0 (no valid interface found)

Feature VLAN:
--------------
VTP Operating Mode                : Server
Maximum VLANs supported locally   : 1005
Number of existing VLANs          : 8
Configuration Revision            : 5
MD5 digest                        : 0x27 0x65 0xD7 0x62 0x5B 0x80 0x92 0x18 
                                    0x2D 0xA8 0x60 0xE8 0x76 0xDF 0x69 0x6D 
```

The trap with v1 and v2 is that Server mode alone does not make SW1's database the one everyone trusts. A switch in the same domain can bring in a higher revision. If the update is accepted, it can replace the existing VLAN database. Erasing the startup configuration alone may leave VLAN database information behind.

#### Reproduce a revision overwrite

![Lab topology for testing a higher VTP revision](/img/vtp/image-20210107171959871.png)

I shut down the link to SW2 to isolate it. Then I put SW2 in Server mode and create and delete VLAN 44. Its revision reaches 7.

```
SW2(config)#vtp mo server
Setting device to VTP Server mode for VLANS.
SW2(config)#vlan 44
SW2(config-vlan)#exit
SW2(config)#no vlan 44
SW2(config)#
SW2(config)#
SW2(config)#do show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 2
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0100
Configuration last modified by 0.0.0.0 at 1-7-21 09:22:12
Local updater ID is 0.0.0.0 (no valid interface found)

Feature VLAN:
--------------
VTP Operating Mode                : Server
Maximum VLANs supported locally   : 1005
Number of existing VLANs          : 8
Configuration Revision            : 7
MD5 digest                        : 0x3F 0xE4 0xFB 0x69 0x90 0x09 0x0F 0xAC 
                                    0xA2 0x5E 0xA8 0xFC 0x5A 0x72 0xE8 0x36 
SW2(config)#no vlan 10,20,30
SW2(config)#
SW2(config)#do show vlan brief 
```

I delete VLANs 10, 20, and 30. SW2 now shows revision 8.

```
SW2(config)#no vlan 10,20,30
SW2(config)#
SW2(config)#do show vlan brief 

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/0, Et0/1, Et0/2, Et0/3
1002 fddi-default                     act/unsup 
1003 trcrf-default                    act/unsup 
1004 fddinet-default                  act/unsup 
1005 trbrf-default                    act/unsup 

SW2(config)#do show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 2
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0100
Configuration last modified by 0.0.0.0 at 1-7-21 09:22:29
Local updater ID is 0.0.0.0 (no valid interface found)

Feature VLAN:
--------------
VTP Operating Mode                : Server
Maximum VLANs supported locally   : 1005
Number of existing VLANs          : 5
Configuration Revision            : 8
MD5 digest                        : 0xC1 0x6D 0x2C 0x75 0x47 0xE9 0xA2 0x0A 
                                    0xD9 0xF8 0xC9 0x5D 0x3A 0xDA 0x64 0x1B 
```

SW1 still shows revision 5 while the link is down.

```
SW1(config)#do show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 2
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0700
Configuration last modified by 0.0.0.0 at 1-7-21 09:15:58
Local updater ID is 0.0.0.0 (no valid interface found)

Feature VLAN:
--------------
VTP Operating Mode                : Server
Maximum VLANs supported locally   : 1005
Number of existing VLANs          : 8
Configuration Revision            : 5
MD5 digest                        : 0x27 0x65 0xD7 0x62 0x5B 0x80 0x92 0x18 
                                    0x2D 0xA8 0x60 0xE8 0x76 0xDF 0x69 0x6D 
```

#### Bring the trunk back and check SW1

I switch SW2 back to Client mode and bring up the trunk.

```
SW2(config)#vtp mode client
Setting device to VTP Client mode for VLANS.
SW2(config)#inter e0/0
SW2(config-if)#no shu
SW2(config-if)#
SW2(config-if)#
SW2(config-if)#
*Jan  7 09:24:27.270: %LINK-3-UPDOWN: Interface Ethernet0/0, changed state to up
*Jan  7 09:24:28.271: %LINEPROTO-5-UPDOWN: Line protocol on Interface Ethernet0/0, cha
nged state to up
SW2(config-if)#
```

SW1 accepts revision 8. The output shows VLANs 10, 20, and 30 are gone, while the local extended-range VLAN 1006 is still there. In a live network, removing those VLANs can cut off traffic.

```
SW1(config)#do show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 2
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0700
Configuration last modified by 0.0.0.0 at 1-7-21 09:22:29
Local updater ID is 0.0.0.0 (no valid interface found)

Feature VLAN:
--------------
VTP Operating Mode                : Server
Maximum VLANs supported locally   : 1005
Number of existing VLANs          : 5
Configuration Revision            : 8
MD5 digest                        : 0xC1 0x6D 0x2C 0x75 0x47 0xE9 0xA2 0x0A 
                                    0xD9 0xF8 0xC9 0x5D 0x3A 0xDA 0x64 0x1B 
SW1(config)#do show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/2, Et0/3
1002 fddi-default                     act/unsup 
1003 trcrf-default                    act/unsup 
1004 fddinet-default                  act/unsup 
1005 trbrf-default                    act/unsup 
1006 black                            active    
SW1(config)#
```

#### Check that the revision resets

On this lab switch, switching SW2 to Transparent mode resets the revision to 0.

```
SW2(config)#vtp mode transparent 
Setting device to VTP Transparent mode for VLANS.
SW2(config)#do show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 2
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0100
Configuration last modified by 0.0.0.0 at 1-7-21 09:22:29

Feature VLAN:
--------------
VTP Operating Mode                : Transparent
Maximum VLANs supported locally   : 1005
Number of existing VLANs          : 5
Configuration Revision            : 0
MD5 digest                        : 0xC1 0x6D 0x2C 0x75 0x47 0xE9 0xA2 0x0A 
                                    0xD9 0xF8 0xC9 0x5D 0x3A 0xDA 0x64 0x1B 
```

Before connecting a reused switch to a v1 or v2 domain, I check its VLAN database and revision while it is isolated. I verify the reset on the actual device before bringing up the trunk.

### VTP version 3

I use the same topology to try v3.

![Three-switch VTP version 3 lab topology](/img/vtp/image-20210107175316086.png)

```
SW1(config)#vtp version 3
SW1(config)#
*Jan  7 09:53:52.977: %SW_VLAN-6-OLD_CONFIG_FILE_READ: Old version 2 VLAN configuration f
ile detected and read OK.  Version 3
    files will be written in the future.
```

The status now shows separate entries for VLAN and MST. SW1 is a VLAN server, but the Primary ID is still all zeros.

```
SW1(config)#do show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 3
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0700

Feature VLAN:
--------------
VTP Operating Mode                : Server
Number of existing VLANs          : 5
Number of existing extended VLANs : 1
Maximum VLANs supported locally   : 4096
Configuration Revision            : 0
Primary ID                        : 0000.0000.0000
Primary Description               : 
MD5 digest                        : 


Feature MST:
--------------
VTP Operating Mode                : Transparent

          
Feature UNKNOWN:
--------------
VTP Operating Mode                : Transparent
```

#### Set the password

With the **hidden** option, the saved output shows a key instead of the plain lab password. This option hides the stored password. It does not encrypt traffic on the trunk.

```
SW1(config)#VTP password CCIE HIdden 
Setting device VTP password  
SW1(config)#DO SHOW VTP PASSWORD
VTP Password: 621F5C1360325D70E1B404F1D48E270F
SW1(config)#
```

#### Make SW1 the VLAN primary server

I try to create VLAN 10 while SW1 is a server but has not taken the primary role. The switch refuses.

```
SW1(config)#vlan 10
VTP VLAN configuration not allowed when device is not the primary server for vlan databas
e.
SW1(config)#

```

I run **vtp primary vlan** from the privileged EXEC prompt, enter the VTP password, and confirm the takeover. SW1 can now make changes to the domain's VLAN database.

```
SW1#vtp primary vlan
This system is becoming primary server for feature vlan 
Enter VTP Password: 
No conflicting VTP3 devices found.
Do you want to continue? [confirm]
SW1#
*Jan  7 10:04:38.714: %SW_VLAN-4-VTP_PRIMARY_SERVER_CHG: aabb.cc80.0700 has become the pr
imary server for the VLAN VTP feature
```

## VTP pruning

An allowed VLAN list tells the switch which VLANs may use a trunk. VTP pruning works within that list. It saves bandwidth by keeping unnecessary flooded traffic off links where it is not needed.

For example, I can use VLAN 10 in the office and VLAN 20 in the industrial building. Both switches may know about both VLANs. That does not mean the industrial building needs to receive every VLAN 10 broadcast.

### Pruning lab topology

![Office and industrial VLANs on a shared trunk topology](/img/vtp/image-20210114170218807.png)

The office uses VLAN 10, the industrial building uses VLAN 20, and the trunks allow all VLANs.

### Follow ARP with pruning disabled

VPC4 sends a VLAN 10 ARP request. With pruning off, SW3 gets a copy even though it has no VLAN 10 hosts.

![ARP broadcast reaching both branches before pruning](/img/vtp/image-20210114171042514.png)

With pruning enabled, switches use VTP Join messages to signal which eligible VLANs need flooded traffic on a trunk. VLAN 1 is not eligible for pruning.

### Enable pruning

For this v2 test, I enable **vtp pruning** on the server. In v1 and v2 it is a domain setting for participating switches. V3 requires enabling it on each device. The saved status shows SW1 enabled and SW2 in Transparent mode with pruning disabled, so I use the port output below to check the actual result.

```
SW1(config)#do show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 2
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Enabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0700
Configuration last modified by 1.1.1.1 at 1-14-21 09:18:57
Local updater ID is 1.1.1.1 on interface Vl1 (lowest numbered VLAN interface found)

Feature VLAN:
--------------
VTP Operating Mode                : Server
Maximum VLANs supported locally   : 1005
Number of existing VLANs          : 8
Configuration Revision            : 5
MD5 digest                        : 0x79 0xB5 0x24 0x51 0x54 0xBD 0x14 0xB9
                                    0xA3 0xAE 0xCF 0x80 0x7F 0x2A 0x5D 0xE8



SW2(config)#do show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 2
VTP Domain Name                 : CCIE
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : aabb.cc80.0100
Configuration last modified by 1.1.1.1 at 1-14-21 09:18:07

Feature VLAN:
--------------
VTP Operating Mode                : Transparent
Maximum VLANs supported locally   : 1005
Number of existing VLANs          : 8
Configuration Revision            : 0
MD5 digest                        : 0xB4 0xFD 0xF7 0x39 0x3B 0xE6 0x94 0xFF
                                    0xE9 0x07 0xA7 0xC7 0x7C 0x10 0xBB 0x43

```

### Check the trunk and pruning status

I use **show interfaces pruning** to see which VLANs were pruned on each link. The two columns in the output describe opposite directions: what the neighbor did not request, and what this switch requested from the neighbor.

```
SW1#show inter pruning

Port                Vlans pruned for lack of request by neighbor
Et0/0               10,30
Et0/1               20,30

Port                Vlan traffic requested of neighbor
Et0/0               1,10
Et0/1               1,20

```

**show interfaces trunk** also shows the difference. SW2's allowed list is still 1–4094, but the final list shows only VLANs 1 and 20 forwarding and not pruned at the time of the capture.

```
SW2(config-if)#do show inter pru

Port                Vlans pruned for lack of request by neighbor
Et0/0               10,20,30

Port                Vlan traffic requested of neighbor
Et0/0               1,10
SW2#show inter trunk

Port        Mode             Encapsulation  Status        Native vlan
Et0/0       on               802.1q         trunking      1

Port        Vlans allowed on trunk
Et0/0       1-4094

Port        Vlans allowed and active in management domain
Et0/0       1,10,20,30

Port        Vlans in spanning tree forwarding state and not pruned
Et0/0       1,20


SW3(config-if)#DO SHOW INTER PRU

Port                Vlans pruned for lack of request by neighbor
Et0/0               10,30

Port                Vlan traffic requested of neighbor
Et0/0               1,20

```

## A note from production

When I first learned VTP, I liked that I could add a VLAN by touching one switch. It took me a while to realize how easily I could delete it everywhere, too. A lot of us learned that one the hard way.

These days we usually leave VTP off in production. Creating a VLAN takes a few more commands, but I know exactly which switches I'm changing.
