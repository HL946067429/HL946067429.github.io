package com.xyl.launcher.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * 把任意卡片 Composable 包一层，自动在右上角叠加 ⋮⋮ 拖拽把手。
 *
 * 这样接拖拽时不必动 6 个 Card 文件的源码，调用方只要：
 * ```
 * DraggableLane(items, onReorder) { id, handle ->
 *     DraggableCardSlot(dragHandle = handle) {
 *         TirePressureCard(...)
 *     }
 * }
 * ```
 */
@Composable
fun DraggableCardSlot(
    dragHandle: Modifier,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Box(modifier = modifier.fillMaxSize()) {
        // 真正的卡片
        content()
        // 右上角把手
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 6.dp, end = 8.dp)
                .then(dragHandle)
                .size(width = 28.dp, height = 22.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text("⋮⋮", fontSize = 14.sp, color = Color(0xB3FFFFFF))
        }
    }
}
