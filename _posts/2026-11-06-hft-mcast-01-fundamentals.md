---
layout: post
title: "Multicast Basics in CML with a Market Data Feed"
subtitle: "Three Alpine hosts, one switch, and a UDP port worth checking."
date: 2026-11-06 00:00:00 +0800
author: i9u
header-img: img/post-bg-desk.png
catalog: true
tags:
  - Cisco
  - Multicast
  - CML
  - Trading Networks
---

> Before blaming multicast, check that the hosts can ping each other.

## 1. Why I did this lab

I wanted to brush up on multicast, so I went back to the simplest setup I could think of. One exchange sends a feed, two feed handlers want it, and all three hosts sit on the same LAN. Before getting into PIM again, I wanted to see what the sender actually puts on the wire and what each receiver has to do to get the data.

## 2. Lab environment and topology

I used three Alpine hosts and one unmanaged switch in CML. The hosts take 512 MiB each, so that's 1.5 GiB for the three guests. Four nodes fit easily within my CML Personal limit. Alpine already had iPerf 2 and `tcpdump`, so the setup was pretty quick.

```text
EXCHANGE-SRC  10.10.10.10
              |
           FEED-LAN
           /       \
       FH-1         FH-2
  10.10.10.21   10.10.10.22
```

I put all three interfaces in `10.10.10.0/24` and added `ip route replace 224.0.0.0/4 dev eth0` inside the lab. The addresses in the diagram are enough to reproduce the setup. The channel I made up for this test uses source `10.10.10.10`, group `239.10.10.1`, and UDP destination port `5000`.

## 3. Get unicast working first

I pinged `.21` and `.22` from the source. Then I started a UDP listener on FH-1 and sent 15 seconds of traffic directly to it. Pretty standard stuff, but now I have a baseline if the multicast test gives me nothing.

```sh
# FH-1
iperf -s -u -B 10.10.10.21 -p 5000 -i 1

# EXCHANGE-SRC
iperf -c 10.10.10.21 -u -B 10.10.10.10 -p 5000 -b 64k -l 256 -t 15
```

## 4. Send the same feed to both hosts

I stopped the unicast listener with Ctrl+C, then started the multicast listener on both hosts. The publisher sends to the group this time. Look at the sender command and see if you can find either feed handler's IP in it.

```sh
# FH-1 and FH-2, in separate consoles
iperf -s -u -B 239.10.10.1 -p 5000 -i 1

# EXCHANGE-SRC
iperf -c 239.10.10.1 -u -B 10.10.10.10 -p 5000 -b 64k -l 256 -t 30 -T 1
```

Both receivers can report traffic from that one stream. The sender targets `239.10.10.1:5000`, and the switch forwards a copy onto each receiver link in this setup. I kept the feed at 64 kbit/s. A few packets are enough to see what's going on.

## 5. Take a look at the packet

I ran this on a receiver while the source was sending. If you're following along in CML, you can also capture the link between the source and the switch.

```sh
tcpdump -ni eth0 -e -vv -c 10 'udp and dst host 239.10.10.1 and dst port 5000'
```

The source IP is `.10`, the destination IP is `239.10.10.1`, and `5000` is the UDP destination port. Look one layer down and the destination MAC is `01:00:5e:0a:0a:01`.

Here's the bit I had to work out again. What MAC does `239.138.10.1` map to? Same one. The mapping only uses the low 23 bits of the group address. The bit that changes between `10` and `138` in the second octet is outside those 23 bits. When I filter a capture for a specific feed, I check the destination IP as well as the MAC.

I sent the stream once with `-T 1` and again with `-T 16`. Compare the two captures and the TTL changes with the sender setting. Compare the two links within the same run and it stays the same. There's only a Layer 2 switch in between.

## 6. Same group, wrong port

I left FH-1 alone and restarted FH-2's listener on `5001`.

```sh
# FH-2, after stopping the listener on port 5000
iperf -s -u -B 239.10.10.1 -p 5001 -i 1
```

The source still sends to `5000`. The FH-2 link can have packets for the right group while its listener sits there waiting on `5001`. Put it back on `5000` and resend the stream. That's a quick way to separate group membership from UDP delivery. IGMP carries the group membership, and IGMPv3 can also carry source filters. The application still needs to listen on the right UDP port.

If FH-1 has market data and FH-2 goes quiet, I'd start by comparing the source, group, port, and interface on both sides. Then I'd capture on the FH-2 link. If the right packets are there, I'd check what the application joined and where it bound its socket. I'd also ask when the feed went quiet. A failure on startup and a failure just after a network change give me different places to start looking.

Next time I'll use a switch with IGMP snooping and see which ports actually get a copy when only one feed handler joins.

[iPerf 2 multicast command reference](https://iperf.fr/iperf-doc.php)
