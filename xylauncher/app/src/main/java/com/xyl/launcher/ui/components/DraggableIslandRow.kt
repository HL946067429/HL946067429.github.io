package com.xyl.launcher.ui.components

import androidx.compose.foundation.gestures.Orientation
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * 横向拖拽重排 Row —— 现在是 [DraggableLane] 横向方向的便捷别名。保留作为已有调用点的兼容入口。
 */
@Composable
fun <T> DraggableIslandRow(
    items: List<T>,
    onReorder: (List<T>) -> Unit,
    modifier: Modifier = Modifier,
    horizontalSpacing: Dp = 10.dp,
    keyOf: (T) -> Any = { it as Any },
    content: @Composable (item: T, dragHandle: Modifier) -> Unit,
) {
    DraggableLane(
        items = items,
        onReorder = onReorder,
        modifier = modifier,
        orientation = Orientation.Horizontal,
        spacing = horizontalSpacing,
        keyOf = keyOf,
        content = content,
    )
}
