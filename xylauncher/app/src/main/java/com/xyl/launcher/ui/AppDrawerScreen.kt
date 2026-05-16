package com.xyl.launcher.ui

import android.widget.ImageView
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.xyl.launcher.App
import com.xyl.launcher.apps.AppInfo

private const val COLS = 6
private const val ROWS = 4
private const val PER_PAGE = COLS * ROWS

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun AppDrawerScreen(onBack: () -> Unit) {
    val app = App.instance
    val apps by app.appRepository.apps.collectAsState()

    LaunchedEffect(Unit) { app.appRepository.refresh() }

    val pages = apps.chunked(PER_PAGE)
    val pagerState = rememberPagerState(pageCount = { pages.size.coerceAtLeast(1) })

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0E1A))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // 顶部栏
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    "全部应用 (${apps.size})",
                    fontSize = 22.sp, color = Color.White, fontWeight = FontWeight.Medium,
                )
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Color(0x33FFFFFF))
                        .clickable(onClick = onBack)
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                ) {
                    Text("返回", fontSize = 13.sp, color = Color.White)
                }
            }

            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxWidth().weight(1f),
            ) { pageIdx ->
                val pageApps = pages.getOrNull(pageIdx) ?: emptyList()
                AppPage(pageApps) { info -> app.appRepository.launch(info.packageName) }
            }

            // 页码指示器
            if (pages.size > 1) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                ) {
                    for (i in pages.indices) {
                        Box(
                            modifier = Modifier
                                .padding(4.dp)
                                .size(if (i == pagerState.currentPage) 10.dp else 6.dp)
                                .clip(CircleShape)
                                .background(
                                    if (i == pagerState.currentPage) Color.White
                                    else Color(0x55FFFFFF)
                                )
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AppPage(pageApps: List<AppInfo>, onClick: (AppInfo) -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        pageApps.chunked(COLS).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth().height(110.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                row.forEach { info ->
                    Box(modifier = Modifier.weight(1f).fillMaxSize()) {
                        AppCell(info, onClick)
                    }
                }
                repeat(COLS - row.size) {
                    Box(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun AppCell(info: AppInfo, onClick: (AppInfo) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick(info) }
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        AndroidView(
            factory = { ImageView(it) },
            update = { it.setImageDrawable(info.icon) },
            modifier = Modifier.size(64.dp),
        )
        Text(
            info.label, fontSize = 12.sp, color = Color.White,
            maxLines = 1, overflow = TextOverflow.Ellipsis,
        )
    }
}
