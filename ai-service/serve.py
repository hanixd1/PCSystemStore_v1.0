"""Production entry point: one dual-stack socket for public (IPv4) and private (IPv6) traffic.

`uvicorn --host ::` opens an IPv6-only socket (asyncio sets IPV6_V6ONLY), so Railway's public
proxy and health check over IPv4 would stop reaching the service. This binds `[::]` with
IPV6_V6ONLY disabled, which accepts both, and falls back to IPv4 on hosts without IPv6.

    python serve.py            # PORT from the environment, 8000 by default
"""

import os
import socket

import uvicorn


def dual_stack_socket(port: int) -> socket.socket:
    try:
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        address: tuple[str, int] = ("::", port)
    except OSError:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        address = ("0.0.0.0", port)  # noqa: S104 - the container must accept outside traffic
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(address)
    sock.set_inheritable(True)
    return sock


def main() -> None:
    port = int(os.getenv("PORT", "8000"))
    config = uvicorn.Config("main:app", proxy_headers=True, forwarded_allow_ips="*")
    uvicorn.Server(config).run(sockets=[dual_stack_socket(port)])


if __name__ == "__main__":
    main()
