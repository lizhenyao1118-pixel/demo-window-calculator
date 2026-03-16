import os
import sys
from fontTools.subset import Subsetter, load_font, Options

# 完整字符集（内嵌，不依赖外部文件）
FULL_CHARSET = """
第一章第二章第三章第四章项目概况与需求分析技术参数性能指标产品配置预算方案风险提示验收节点及商家响应请于在之了了的是吗呢吧呀哦嗯和或与而及乃至但虽然然而如果因为所以因此可是不过其实然后接着随后最后终于究竟到底简直根本难道岂止偏偏深圳严禁再生使用提供普通品质咨询节约关注过高建议系统提高系数或者可见渗漏盖章发送凭证作为填写报告风险须知禁止采用型材壁厚隔热条密封胶结构胶检测配置升级选项抗风压性能隔声量热工性能K值SHGC中空玻璃LowE膜五金铰链负载EPDM胶条密封填充中性硅酮发泡剂窗框墙体验收进场竣工核查产品铭牌品牌型号报价单实测壁厚截面检测报告间隔层厚度烟雾笔可见气密性淋水测试手动执手传动锁闭所有开启扇部位拆除保护膜单位加盖公章签字确认联系信息返回业主正式凭证工作日填写完毕发送扫描件照发品牌及系列系列名称隔热条宽度穿条式断桥注胶式三玻两腔夹胶儿童限位器预算档位对比经济舒适品质定制高区位置风压负载较A档高层安全系数性价比方案选材指导深度审计服务技术顾问系统基于用户填写信息自动生成仅供参考不构成正式法律效力文件编号签发日期高度比气候区楼层取暖不需要家庭噪音评级核心红线采购提交响应方案型材截面拆除保护膜所有开启扇部位执手传动锁闭部位联系信息加盖公章签字确认照发扫描件返回业主正式凭证填写完毕工作日请于0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz·/|-()[]【】℃㎡≥≤①②③④.,:;'"?!%&@
"""

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_INPUT = os.path.join(BASE_DIR, 'font.otf')
FONT_OUTPUT = os.path.join(BASE_DIR, 'font-subset.otf')

print(f"输入字体: {FONT_INPUT} ({os.path.getsize(FONT_INPUT)/1024:.1f} KB)")
print(f"字符集大小: {len(set(FULL_CHARSET))} 个唯一字符")

try:
    options = Options()
    options.hinting = False
    options.ignore_missing_glyphs = True
    
    font = load_font(FONT_INPUT, options)
    subsetter = Subsetter(options)
    subsetter.populate(text=FULL_CHARSET)
    subsetter.subset(font)
    
    font.save(FONT_OUTPUT)
    
    output_size = os.path.getsize(FONT_OUTPUT)
    print(f"成功生成: {FONT_OUTPUT}")
    print(f"输出大小: {output_size/1024:.1f} KB")
    
    if output_size < 150 * 1024:
        print("警告: 文件仍然太小，可能字体文件本身不包含这些字形")
    else:
        print("✓ 成功！字体大小正常")
        
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()