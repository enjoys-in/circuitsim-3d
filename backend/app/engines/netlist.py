from __future__ import annotations

from collections import defaultdict

from app.domain.entities.project import Circuit


def endpoint(instance_id: str, pin: str) -> str:
    return f"{instance_id}:{pin}"


def split_endpoint(value: str) -> tuple[str, str]:
    instance_id, _, pin = value.partition(":")
    return instance_id, pin


class Netlist:
    """Merges nets that share endpoints into electrical nodes."""

    def __init__(self, circuit: Circuit) -> None:
        self._parent: dict[str, str] = {}
        for net in circuit.nets:
            for point in net.endpoints:
                self._parent.setdefault(point, point)
            for a, b in zip(net.endpoints, net.endpoints[1:], strict=False):
                self._union(a, b)

        roots: dict[str, int] = {}
        self._node_of: dict[str, int] = {}
        for point in self._parent:
            root = self._find(point)
            self._node_of[point] = roots.setdefault(root, len(roots))
        self._count = len(roots)

        self._nets: dict[int, list[str]] = defaultdict(list)
        self._net_node: dict[str, int] = {}
        for net in circuit.nets:
            if not net.endpoints:
                continue
            node = self._node_of[net.endpoints[0]]
            self._nets[node].append(net.id)
            self._net_node[net.id] = node

        self._endpoints: dict[int, list[str]] = defaultdict(list)
        for point, node in self._node_of.items():
            self._endpoints[node].append(point)

    @property
    def node_count(self) -> int:
        return self._count

    def node(self, instance_id: str, pin: str) -> int | None:
        return self._node_of.get(endpoint(instance_id, pin))

    def endpoints(self, node: int) -> list[str]:
        return self._endpoints.get(node, [])

    def net_ids(self, node: int) -> list[str]:
        return self._nets.get(node, [])

    def node_of_net(self, net_id: str) -> int | None:
        return self._net_node.get(net_id)

    def instances_on(self, node: int) -> set[str]:
        return {split_endpoint(p)[0] for p in self.endpoints(node)}

    def by_net(self, values: dict[int, object]) -> dict[str, object]:
        return {net_id: values.get(node) for net_id, node in self._net_node.items()}

    def _find(self, point: str) -> str:
        parent = self._parent
        while parent[point] != point:
            parent[point] = parent[parent[point]]
            point = parent[point]
        return point

    def _union(self, a: str, b: str) -> None:
        root_a, root_b = self._find(a), self._find(b)
        if root_a != root_b:
            self._parent[root_b] = root_a
