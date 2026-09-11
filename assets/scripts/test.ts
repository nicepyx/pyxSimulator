import { _decorator, Component, Node } from "cc";
const { ccclass, property } = _decorator;
import * as fgui from "fairygui-cc";

@ccclass("test")
export class test extends Component {
    start() {
        console.log("加载成功", fgui);
    }
}
