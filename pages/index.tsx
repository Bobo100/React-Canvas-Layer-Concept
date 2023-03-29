import Head from "next/head";
import { Decimal } from "decimal.js"
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Layout from '../components/layout';
import { actionHistoryStyles } from "../components/styles";

// 圖層的概念就是 他們要建立z-index的概念
// 當然每一層都必須包含 圖片 或是 Path.2D
// 這樣才能夠在畫布上畫出來

// 在canvas中的圖片，每一個都要可以去做編輯 (像是拖移、旋轉、縮放)
// 可以透過isPointInPath來判斷滑鼠是否在圖片上，如果是的話就可以進行編輯
// 並且會抓取最上層(zIndex)的圖片來進行編輯

interface ImageLayer {
    type: 'image';
    scale: number;
    imageRange: [number, number, number, number];
    imageRangeOrigin: [number, number, number, number];
    image: HTMLImageElement;
    zIndex: number;
}

interface PathLayer {
    type: 'path';
    path: Path2D;
    fillColor: string;
    strokeColor: string;
    stokeWidth: number;
    image?: HTMLImageElement; // 有可能是裁切過的圖片 所以我們要把圖片也放進來
    zIndex: number;
}

type Layer = ImageLayer | PathLayer;

function HomePage() {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [image, setImage] = useState<HTMLImageElement>();
    const [startCoords, setStartCoords] = useState({ x: 0, y: 0 });

    const [layers, setLayers] = useState<Layer[]>([]);

    // layer history用來記錄每一個步驟的layers
    const [layerHistory, setLayerHistory] = useState<Layer[][]>([[]]);
    const [currentStep, setCurrentStep] = useState<number>(0);
    // 紀錄操作流程
    const MAX_ACTION_HISTORY = 5;
    const [actionHistory, setActionHistory] = useState<string[]>([]);

    const addACtionHistory = (action: string) => {
        if (actionHistory.length >= MAX_ACTION_HISTORY) {
            setActionHistory([...actionHistory.slice(1), action]);
        } else {
            setActionHistory([...actionHistory, action]);
        }
    }

    // 
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [mouseInCanvasPosition, setMouseInCanvasPosition] = useState({ x: 0, y: 0 });

    // 紀錄上一個滑鼠的位置
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });

    const largetZIndexRef = useRef(0);
    const isMoveCheckRef = useRef(false);

    console.log("render")
    useEffect(() => {
        draw();
        canvasRef.current?.addEventListener('wheel', handleWheel);

        // console.log(layerHistory)
        // console.log(layers)

        return () => {
            canvasRef.current?.removeEventListener('wheel', handleWheel);
        }

    }, [layers]);

    // 
    const maxScaleFactor = 2;
    const minScaleFactor = 0.1;
    const handleWheel = (e: WheelEvent) => {
        if (layers.length === 0 || largetZIndexRef.current === 0) return;
        e.preventDefault();
        const delta = -Math.sign(e.deltaY);

        // 滾輪放大將改成 現在選取的圖片放大
        if (layers[largetZIndexRef.current - 1].type === 'image') {
            const imageLayer = layers[largetZIndexRef.current - 1] as ImageLayer;
            let newScale = imageLayer.scale;
            if ((imageLayer.scale < maxScaleFactor && delta > 0) || (imageLayer.scale > minScaleFactor && delta < 0)) {
                newScale = new Decimal(imageLayer.scale).plus(delta * 0.1).toNumber();
            }
            if (newScale !== imageLayer.scale) {
                const newLayers = [...layers];
                // 計算縮放後的圖片範圍
                const [x, y, width, height] = imageLayer.imageRangeOrigin;
                const newWidth = new Decimal(width).times(newScale).toNumber();
                const newHeight = new Decimal(height).times(newScale).toNumber();
                const newX = new Decimal(x).minus((newWidth - width) / 2).toNumber();
                const newY = new Decimal(y).minus((newHeight - height) / 2).toNumber();

                newLayers[largetZIndexRef.current - 1] = {
                    ...imageLayer,
                    scale: newScale,
                    imageRange: [newX, newY, newWidth, newHeight]
                }

                setLayers(newLayers);
                // 
                setLayerHistory([...layerHistory.slice(0, currentStep + 1), newLayers]);
                setCurrentStep(currentStep + 1);

                // 記錄操作流程
                addACtionHistory(`scale ${newScale}`);

            }
        }
    };

    // 下一步驟是要加入index功能 看要雙向index還是甚麼
    // 概念上是 判斷滑鼠是否圖片上，如果在就可以進行編輯 (index也要是最上層的圖片)
    function draw() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (layers.length === 0) return;
        layers.forEach(layer => {
            ctx.save();
            if (layer.type === 'image') {
                // const [x, y, width, height] = layer.imageRangeOrigin;
                // ctx.translate(x + width / 2, y + height / 2);
                // ctx.scale(layer.scale, layer.scale)
                // ctx.translate(-(x + width / 2), -(y + height / 2));
                // // console.log(x, y, width, height)
                // ctx.drawImage(layer.image, x, y, width, height);

                const [x, y, width, height] = layer.imageRange;

                // console.log("draw: ", x, y, width, height)
                ctx.drawImage(layer.image, x, y, width, height);
            } else {
                ctx.fillStyle = layer.fillColor;
                ctx.strokeStyle = layer.strokeColor;
                ctx.lineWidth = layer.stokeWidth;
                ctx.fill(layer.path);
                ctx.stroke(layer.path);
            }
            ctx.restore();
        });
    }

    // 滑鼠點擊的事件 // 點擊的時候判斷在哪一個圖片上
    function handleMouseDown(event: React.MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const cavnasBox = canvas.getBoundingClientRect();
        const mouseX = new Decimal(event.clientX).minus(cavnasBox.left).times(canvas.width).div(cavnasBox.width).toNumber();
        const mouseY = new Decimal(event.clientY).minus(cavnasBox.top).times(canvas.height).div(cavnasBox.height).toNumber();
        console.log(mouseX, mouseY)
        // 判斷滑鼠是否在圖片上 與 獲得目前位置最上層的圖片index
        if (isMouseOverImage(mouseX, mouseY)) {
            console.log("mouse is on image:" + largetZIndexRef.current);
            setLastMousePosition({ x: mouseX, y: mouseY });
            setIsDragging(true);
        }
    }

    // 滑鼠移動的事件
    function handleMouseMove(event: React.MouseEvent<HTMLCanvasElement>) {
        if (event.buttons === 1 && isDragging) {
            // 判斷滑鼠是否在圖片上 與 獲得目前位置最上層的圖片index
            if (layers[largetZIndexRef.current - 1].type === 'image') {
                const imageLayer = layers[largetZIndexRef.current - 1] as ImageLayer;
                const canvas = canvasRef.current;
                if (!canvas) return;
                const cavnasBox = canvas.getBoundingClientRect();
                const mouseX = new Decimal(event.clientX).minus(cavnasBox.left).times(canvas.width).div(cavnasBox.width).toNumber();
                const mouseY = new Decimal(event.clientY).minus(cavnasBox.top).times(canvas.height).div(cavnasBox.height).toNumber();

                // 這邊去更改位置 並且重新繪製
                const newLayers = [...layers];
                const [oldX, oldY, oldWidth, oldHeight] = imageLayer.imageRange;

                const mouseMovementX = mouseX - lastMousePosition.x;
                const mouseMovementY = mouseY - lastMousePosition.y;
                let newX = oldX + mouseMovementX
                let newY = oldY + mouseMovementY

                // 圖片不能超出畫布 // 還未完成 (要考慮到使用者體驗)


                //同時去更改Origin
                const [oldXOrigin, oldYOrigin, oldWidthOrigin, oldHeightOrigin] = imageLayer.imageRangeOrigin;
                const newXOrigin = new Decimal(newX).plus((oldWidthOrigin * imageLayer.scale - oldWidthOrigin) / 2).toNumber();
                const newYOrigin = new Decimal(newY).plus((oldHeightOrigin * imageLayer.scale - oldHeightOrigin) / 2).toNumber();

                newLayers[largetZIndexRef.current - 1] = {
                    ...imageLayer,
                    imageRangeOrigin: [newXOrigin, newYOrigin, oldWidthOrigin, oldHeightOrigin],
                    imageRange: [newX, newY, oldWidth, oldHeight]
                }
                isMoveCheckRef.current = true;
                setLayers(newLayers);
                setLastMousePosition({ x: mouseX, y: mouseY });
            }

        }

        // setMousePosition({ x: event.clientX, y: event.clientY });
        // const canvas = canvasRef.current;
        // if (!canvas) return;
        // const cavnasBox = canvas.getBoundingClientRect();
        // const mouseXString = new Decimal(event.clientX - cavnasBox.left).times(canvas.width / cavnasBox.width).toFixed(2);
        // const mouseYString = new Decimal(event.clientY - cavnasBox.top).times(canvas.height / cavnasBox.height).toFixed(2);
        // const mouseX = Number(mouseXString);
        // const mouseY = Number(mouseYString);
        // setMouseInCanvasPosition({ x: mouseX, y: mouseY });
    }

    // 滑鼠放開的事件
    function handleMouseUp(event: React.MouseEvent<HTMLCanvasElement>) {
        // 紀錄歷史
        if (isMoveCheckRef.current) {
            setLayerHistory([...layerHistory.slice(0, currentStep + 1), layers]);
            setCurrentStep(currentStep + 1);
            setIsDragging(false);
            isMoveCheckRef.current = false;
        }
    }

    function handleMouseLeave(event: React.MouseEvent<HTMLCanvasElement>) {
        setIsDragging(false);
    }

    function isMouseOverImage(mouseX: number, mouseY: number) {
        const canvas = canvasRef.current;
        if (!canvas) return false;
        const ctx = canvas.getContext("2d");
        if (!ctx) return false;

        let isMouseOver = false;

        // 找出最上層的圖片
        layers.forEach(layer => {
            ctx.save();
            if (layer.type === 'image') {
                // const [x, y, width, height] = layer.imageRangeOrigin;
                // const rectPath = new Path2D();
                // const newX = x + (width / 2) * (1 - layer.scale);
                // const newY = y + (height / 2) * (1 - layer.scale);
                // const newWidth = width * layer.scale;
                // const newHeight = height * layer.scale;
                // rectPath.rect(newX, newY, newWidth, newHeight);

                const [x, y, width, height] = layer.imageRange;

                const rectPath = new Path2D();
                rectPath.rect(x, y, width, height);

                if (ctx.isPointInPath(rectPath, mouseX, mouseY)) { // 利用 isPointInPath() 判斷鼠標位置是否在路徑內
                    largetZIndexRef.current = layer.zIndex;
                    isMouseOver = true;
                }
            }
            else {
                if (ctx.isPointInPath(layer.path, mouseX, mouseY)) { // 利用 isPointInPath() 判斷鼠標位置是否在路徑內
                    largetZIndexRef.current = layer.zIndex;
                    isMouseOver = true;
                }
            }
            ctx.restore();
        });
        return isMouseOver;
    }

    // 這邊是控制拖移照片進入到畫布的部分
    function handleDragOver(event: React.DragEvent<HTMLCanvasElement>) {
        event.preventDefault();
    }

    function handleDrop(event: React.DragEvent<HTMLCanvasElement>) {
        event.preventDefault();
        if (!image) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const canvasBox = canvas.getBoundingClientRect();
        // 乘以canvas.width / canvasBox.width 是為了解決canvas的寬度與實際顯示的寬度不一樣的問題
        const x = new Decimal(event.nativeEvent.offsetX).minus(startCoords.x).toNumber() * canvas.width / canvasBox.width;
        const y = new Decimal(event.nativeEvent.offsetY).minus(startCoords.y).toNumber() * canvas.height / canvasBox.height;
        const width = image.width;
        const height = image.height;
        console.log('mouseX:', event.nativeEvent.offsetX, 'mouseY:', event.nativeEvent.offsetY)
        console.log('startCoords.x:', startCoords.x, 'startCoords.y:', startCoords.y)
        console.log("x : ", x, "y : ", y, "width : ", width, "height : ", height)

        const imageLayer: ImageLayer = {
            type: 'image',
            scale: 1,
            imageRange: [x, y, width, height],
            imageRangeOrigin: [x, y, width, height],
            image: image,
            zIndex: layers.length + 1,
        }
        const newLayers = [...layers, imageLayer];
        setLayers(newLayers);
        const newHistory = layerHistory.slice(0, currentStep + 1);
        newHistory.push(newLayers);
        setLayerHistory(newHistory);
        setCurrentStep(currentStep + 1);
        addACtionHistory('add')

        largetZIndexRef.current = imageLayer.zIndex;
    }

    function handleDragStart(event: React.DragEvent<HTMLImageElement>) {
        // 滑鼠抓住在圖片上的位置
        startCoords.x = event.nativeEvent.offsetX;
        startCoords.y = event.nativeEvent.offsetY;
        console.log("drag start", startCoords.x, startCoords.y)
        setStartCoords(startCoords);
        setImage(event.currentTarget);
    }

    function handleDragEnd(event: React.DragEvent<HTMLImageElement>) {
    }


    /// 這邊是控制圖層的部分
    const handleUndo = () => {
        if (currentStep <= 0) return;

        setCurrentStep((prev) => (prev - 1));
        setLayers(layerHistory[currentStep - 1]);
        addACtionHistory('undo')
    }


    const handleRedo = () => {
        if (currentStep >= layerHistory.length - 1) return;

        setCurrentStep((prev) => (prev + 1));
        setLayers(layerHistory[currentStep + 1]);
        addACtionHistory('redo')
    }


    const handleClear = () => {
        // 如果上一個步驟已經是空的，就不要再新增一個空的步驟
        if (layerHistory[currentStep].length === 0) return;
        const newLayers: Layer[] = [];
        setLayers(newLayers);

        // 把所有的layer都放到history裡面
        const newHistory = layerHistory.slice(0, currentStep + 1);
        newHistory.push(newLayers);
        setLayerHistory(newHistory);
        setCurrentStep(currentStep + 1);
        addACtionHistory('clear')
    }

    return (
        <Layout>
            <Head>
                <title>圖層</title>
            </Head>
            <div className="control">
                <div>{mousePosition.x}</div>
                <div>{mousePosition.y}</div>
                <div>{mouseInCanvasPosition.x}</div>
                <div>{mouseInCanvasPosition.y}</div>
                <button onClick={handleUndo}>上一步</button>
                <button onClick={handleRedo}>下一步</button>
                <button onClick={handleClear}>清除</button>
            </div>
            <div className="flex relative">
                <canvas ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
                <div>
                    <div>
                        <Image src="/images/profile.jpg" width={20} height={20} alt=""
                            draggable
                            onDragStart={handleDragStart}
                            // onDragEnd={handleDragEnd}
                        />
                    </div>
                    <div>
                        <Image src="/images/profile.jpg" width={20} height={20} alt=""
                            draggable
                            onDragStart={handleDragStart}
                            // onDragEnd={handleDragEnd}
                        />
                    </div>
                </div>
                {/* 操作紀錄 */}
                <div>
                    <div>操作紀錄</div>
                    <div style={actionHistoryStyles}>
                        {actionHistory.map((action, index) => {
                            return (
                                <div key={index}>
                                    {action}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

        </Layout>
    )
}

export default HomePage