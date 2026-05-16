package com.xyl.launcher.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex

/**
 * 通用拖拽重排容器（横/竖）。
 *
 * 关键设计：
 *   - 每个 slot 用 weight(1f) **平分主轴**——保证 N 个卡片视觉上等高/等宽
 *   - swap 用"被拖项的视觉中心是否进入别人的 bounds"判定（[onGloballyPositioned]
 *     抓真实坐标）
 *   - dragOffset 补偿用实际位置差，浮起项视觉连续不抖
 *
 * 卡片内容请用 fillMaxSize() 撑满 slot，否则背景框尺寸会不一致。
 *
 * 注意：[onGloballyPositioned] 看到的是 layout-pass 的自然坐标，不受 graphicsLayer
 * 的 translation 影响（graphicsLayer 只改 draw 不改 layout）。
 */
@Composable
fun <T> DraggableLane(
    items: List<T>,
    onReorder: (List<T>) -> Unit,
    modifier: Modifier = Modifier,
    orientation: Orientation = Orientation.Horizontal,
    spacing: Dp = 10.dp,
    keyOf: (T) -> Any = { it as Any },
    content: @Composable (item: T, dragHandle: Modifier) -> Unit,
) {
    val isHorizontal = orientation == Orientation.Horizontal

    var liveOrder by remember { mutableStateOf(items) }
    var draggedIndex by remember { mutableIntStateOf(-1) }
    var dragOffset by remember { mutableFloatStateOf(0f) }

    LaunchedEffect(items) { if (draggedIndex < 0) liveOrder = items }

    val bounds = remember { mutableStateMapOf<Any, Rect>() }
    val displacements = remember { mutableStateMapOf<Any, Animatable<Float, androidx.compose.animation.core.AnimationVector1D>>() }
    val previousTops = remember { mutableStateMapOf<Any, Float>() }

    @Composable
    fun ItemSlot(index: Int, item: T, slotModifier: Modifier) {
        val key = keyOf(item)
        val displacement = displacements.getOrPut(key) { Animatable(0f) }
        val isDragged = index == draggedIndex

        val currentTop = bounds[key]?.let { if (isHorizontal) it.left else it.top }
        LaunchedEffect(currentTop, key) {
            val prev = previousTops[key]
            if (prev != null && currentTop != null && prev != currentTop && !isDragged) {
                val delta = prev - currentTop
                displacement.snapTo(displacement.value + delta)
                displacement.animateTo(0f, tween(220))
            }
            if (currentTop != null) previousTops[key] = currentTop
        }

        LaunchedEffect(isDragged) {
            if (isDragged && displacement.value != 0f) displacement.snapTo(0f)
        }

        val dragHandleModifier = Modifier.pointerInput(key) {
            detectDragGestures(
                onDragStart = {
                    val idx = liveOrder.indexOf(item)
                    if (idx >= 0) { draggedIndex = idx; dragOffset = 0f }
                },
                onDragEnd = {
                    if (draggedIndex >= 0) onReorder(liveOrder)
                    draggedIndex = -1; dragOffset = 0f
                },
                onDragCancel = {
                    draggedIndex = -1; dragOffset = 0f
                },
                onDrag = { change, drag ->
                    change.consume()
                    val from = draggedIndex
                    if (from < 0) return@detectDragGestures
                    val draggedKey = keyOf(liveOrder[from])
                    val rect = bounds[draggedKey] ?: return@detectDragGestures

                    dragOffset += if (isHorizontal) drag.x else drag.y

                    val visualCenter = if (isHorizontal)
                        (rect.left + rect.right) / 2f + dragOffset
                    else
                        (rect.top + rect.bottom) / 2f + dragOffset

                    var targetIdx = -1
                    for ((i, otherItem) in liveOrder.withIndex()) {
                        if (i == from) continue
                        val r = bounds[keyOf(otherItem)] ?: continue
                        val inside = if (isHorizontal)
                            visualCenter in r.left..r.right
                        else
                            visualCenter in r.top..r.bottom
                        if (inside) { targetIdx = i; break }
                    }

                    if (targetIdx >= 0 && targetIdx != from) {
                        val targetRect = bounds[keyOf(liveOrder[targetIdx])] ?: return@detectDragGestures
                        val oldTop = if (isHorizontal) rect.left else rect.top
                        val newTop = if (isHorizontal) targetRect.left else targetRect.top
                        val newList = liveOrder.toMutableList()
                        val moved = newList.removeAt(from)
                        newList.add(targetIdx, moved)
                        liveOrder = newList
                        dragOffset -= (newTop - oldTop)
                        draggedIndex = targetIdx
                    }
                }
            )
        }

        Box(
            modifier = slotModifier
                .onGloballyPositioned { coords ->
                    val pos = coords.positionInParent()
                    bounds[key] = Rect(
                        left = pos.x,
                        top = pos.y,
                        right = pos.x + coords.size.width,
                        bottom = pos.y + coords.size.height,
                    )
                }
                .zIndex(if (isDragged) 1f else 0f)
                .graphicsLayer {
                    if (isDragged) {
                        if (isHorizontal) translationX = dragOffset
                        else translationY = dragOffset
                        scaleX = 1.04f
                        scaleY = 1.04f
                        alpha = 0.92f
                    } else {
                        if (isHorizontal) translationX = displacement.value
                        else translationY = displacement.value
                    }
                }
        ) {
            content(item, dragHandleModifier)
        }
    }

    if (isHorizontal) {
        Row(
            modifier = modifier,
            horizontalArrangement = Arrangement.spacedBy(spacing),
        ) {
            liveOrder.forEachIndexed { index, item ->
                ItemSlot(index, item, Modifier.weight(1f))
            }
        }
    } else {
        Column(
            modifier = modifier,
            verticalArrangement = Arrangement.spacedBy(spacing),
        ) {
            liveOrder.forEachIndexed { index, item ->
                ItemSlot(index, item, Modifier.weight(1f))
            }
        }
    }
}
