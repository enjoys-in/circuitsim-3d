from __future__ import annotations

from app.domain.entities.project import Circuit

# User-defined parts use this key prefix. They carry no device model — they only
# add pins/connectivity — so engine selection must ignore them.
CUSTOM_PREFIX = "custom_"


def simulatable_keys(circuit: Circuit) -> set[str]:
    """Component keys that carry a device, excluding user 'custom_*' parts."""
    return {
        inst.component_key
        for inst in circuit.instances
        if not inst.component_key.startswith(CUSTOM_PREFIX)
    }
