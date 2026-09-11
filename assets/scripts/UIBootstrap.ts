import { _decorator, Component } from "cc";
import * as fgui from "fairygui-cc";

const { ccclass } = _decorator;

@ccclass("UIBootstrap")
export class UIBootstrap extends Component {
    private mainView: fgui.GComponent | null = null;

    start() {
        // 1. 创建 FairyGUI 的根节点
        fgui.GRoot.create();

        // 2. 加载 FairyGUI 发布的 Main 包
        // 路径相对于 assets/resources
        fgui.UIPackage.loadPackage("fgui/Main", (err) => {
            if (err) {
                console.error("FairyGUI Main 包加载失败：", err);
                return;
            }

            console.log("FairyGUI Main 包加载成功");

            // 3. 创建 Main 包中的 MainView
            this.mainView = fgui.UIPackage.createObject("Main", "MainView").asCom;

            // 4. 让界面铺满屏幕
            this.mainView.makeFullScreen();

            // 5. 加入 FairyGUI 根节点
            fgui.GRoot.inst.addChild(this.mainView);

            console.log("MainView 创建成功");
        });
    }
}
