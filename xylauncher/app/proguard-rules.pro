-keepattributes Signature, InnerClasses, EnclosingMethod

# 反射调用 ECARX / Geely 系统接口的类名/方法名都在字符串里
-keep class com.ecarx.** { *; }
-keep class com.geely.** { *; }
-keep class android.car.** { *; }
