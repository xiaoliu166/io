/**
 * AI智能植物养护机器人 - 配置文件
 * 硬件引脚定义和系统常量
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============= 硬件引脚定义 =============

// 传感器引脚
#define DHT_PIN 4                    // 温湿度传感器 (DHT22)
#define LIGHT_SENSOR_PIN 36          // 光感传感器 (ADC)
#define SOIL_MOISTURE_PIN 39         // 土壤湿度传感器 (ADC)
#define TOUCH_SENSOR_PIN 33          // 触摸传感器 (ADC)

// LED 控制引脚
#define LED_DATA_PIN 5               // WS2812B LED 数据引脚
#define LED_COUNT 12                 // LED 数量

// 音频输出引脚
#define SPEAKER_PIN 25               // PWM 扬声器引脚

// 电源管理引脚
#define BATTERY_VOLTAGE_PIN 35       // 电池电压检测 (ADC)
#define USB_POWER_DETECT_PIN 34      // USB 电源检测

// 状态指示引脚
#define STATUS_LED_PIN 2             // 内置状态 LED

// ============= 传感器配置 =============

// DHT22 传感器类型
#define DHT_TYPE DHT22

// ADC 配置
#define ADC_RESOLUTION 12            // 12位 ADC (0-4095)
#define ADC_VREF 3.3                 // 参考电压 3.3V

// 传感器阈值
#define MOISTURE_THRESHOLD 30        // 土壤湿度阈值 (%)
#define LIGHT_THRESHOLD 500          // 光照强度阈值 (lux)
#define BATTERY_LOW_THRESHOLD 20     // 低电量阈值 (%)

// ============= 时间配置 =============

#define DATA_COLLECTION_INTERVAL 300000    // 数据采集间隔 (5分钟)
#define ALERT_DELAY 1800000                // 提醒延迟 (30分钟)
#define REPEAT_ALERT_INTERVAL 7200000      // 重复提醒间隔 (2小时)
#define STARTUP_TIMEOUT 30000              // 启动超时 (30秒)
#define WIFI_CONNECT_TIMEOUT 10000         // WiFi连接超时 (10秒)

// ============= LED 配置 =============

#define LED_BRIGHTNESS 128           // LED 亮度 (0-255)
#define LED_ANIMATION_SPEED 50       // 动画速度 (ms)

// LED 颜色定义 (RGB)
#define COLOR_HEALTHY 0x00FF00       // 绿色 - 健康
#define COLOR_NEEDS_WATER 0xFFFF00   // 黄色 - 需要浇水
#define COLOR_NEEDS_LIGHT 0xFF0000   // 红色 - 需要光照
#define COLOR_LOW_BATTERY 0xFFA500   // 橙色 - 低电量
#define COLOR_ERROR 0xFF00FF         // 紫色 - 错误
#define COLOR_OFF 0x000000           // 关闭

// ============= 音频配置 =============

#define SPEAKER_VOLUME 50            // 扬声器音量 (0-100)
#define TONE_DURATION 200            // 音调持续时间 (ms)

// 音效频率定义 (Hz)
#define TONE_HAPPY 800
#define TONE_WATER_NEEDED 400
#define TONE_LIGHT_NEEDED 600
#define TONE_TOUCH_RESPONSE 1000
#define TONE_ERROR 200
#define TONE_LOW_BATTERY 300

// ============= WiFi 配置 =============

// 默认 WiFi 配置 (可通过配置模式修改)
#define DEFAULT_WIFI_SSID "PlantCare_Setup"
#define DEFAULT_WIFI_PASSWORD "plantcare123"

// AP 模式配置
#define AP_SSID "PlantCare_"         // 将添加设备ID后缀
#define AP_PASSWORD "setup123"
#define AP_CHANNEL 1
#define AP_MAX_CONNECTIONS 4

// ============= 调试配置 =============

#define DEBUG_ENABLED 1              // 启用调试输出
#define DEBUG_SENSORS 1              // 传感器调试
#define DEBUG_WIFI 1                 // WiFi 调试
#define DEBUG_LED 1                  // LED 调试

// 调试宏
#if DEBUG_ENABLED
    #define DEBUG_PRINT(x) Serial.print(x)
    #define DEBUG_PRINTLN(x) Serial.println(x)
    #define DEBUG_PRINTF(format, ...) Serial.printf(format, ##__VA_ARGS__)
#else
    #define DEBUG_PRINT(x)
    #define DEBUG_PRINTLN(x)
    #define DEBUG_PRINTF(format, ...)
#endif

// ============= 系统配置 =============

#define DEVICE_NAME "PlantCareRobot"
#define FIRMWARE_VERSION "1.0.0"
#define HARDWARE_VERSION "1.0"

// 看门狗超时
#define WATCHDOG_TIMEOUT 30          // 看门狗超时 (秒)

// 内存配置
#define JSON_BUFFER_SIZE 1024        // JSON 缓冲区大小
#define SENSOR_BUFFER_SIZE 100       // 传感器数据缓冲区大小

#endif // CONFIG_H