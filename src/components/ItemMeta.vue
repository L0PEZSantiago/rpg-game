<script setup>
import { computed } from 'vue'
import { EQUIPMENT_QUALITY } from '../game/data'

const props = defineProps({
  item: { type: Object, default: null },
  compact: { type: Boolean, default: false },
})

const quality = computed(() => {
  if (props.item?.kind !== 'equipment' || !props.item.quality) return null
  return EQUIPMENT_QUALITY[props.item.quality] ?? null
})

const lines = computed(() => {
  const item = props.item
  if (!item) return []
  const out = [...(item.affixes ?? [])]
  const sockets = item.sockets ?? []
  if (sockets.length > 0) {
    out.push(`⛋ Pierres : ${sockets.filter(Boolean).length}/${sockets.length}`)
  }
  for (const socket of sockets) {
    if (socket) out.push(`✧ ${socket.name} : ${(socket.affixes ?? []).join(', ')}`)
  }
  return out
})
</script>

<template>
  <div v-if="item" class="item-meta" :class="{ compact }">
    <span v-if="quality" class="item-meta-quality">
      <img :src="quality.icon" alt="" class="item-meta-quality-icon" />
      {{ quality.label }}
    </span>
    <span v-for="line in lines" :key="line" class="item-meta-line">{{ line }}</span>
  </div>
</template>

<style scoped>
.item-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 0.72rem;
}
.item-meta-quality {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #d8cdb8;
}
.item-meta-quality-icon {
  width: 13px;
  height: 13px;
  object-fit: contain;
}
.item-meta-line {
  color: #bde7ff;
}
.item-meta.compact .item-meta-line {
  font-size: 0.68rem;
}
</style>
