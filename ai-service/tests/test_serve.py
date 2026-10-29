import socket

from serve import dual_stack_socket


def test_dual_stack_socket_accepts_ipv4_and_ipv6():
    sock = dual_stack_socket(0)
    try:
        port = sock.getsockname()[1]
        sock.listen()
        families = [socket.AF_INET]
        if sock.family == socket.AF_INET6:
            assert sock.getsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY) == 0
            families.append(socket.AF_INET6)
        for family in families:
            host = "127.0.0.1" if family == socket.AF_INET else "::1"
            with socket.create_connection((host, port), timeout=2):
                pass
    finally:
        sock.close()
