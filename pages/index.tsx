import Head from "next/head";
import { Decimal } from "decimal.js"
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Layout from '../components/layout';

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


    console.log("render")

    useEffect(() => {
        draw();
        // console.log(layers);
        canvasRef.current?.addEventListener('wheel', handleWheel);

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
                newLayers[largetZIndexRef.current - 1] = {
                    ...imageLayer,
                    scale: newScale
                }
                setLayers(newLayers);
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
                const [x, y, width, height] = layer.imageRange;
                ctx.translate(x + width / 2, y + height / 2);
                ctx.scale(layer.scale, layer.scale)
                ctx.translate(-(x + width / 2), -(y + height / 2));
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

        // requestAnimationFrame(draw);
    }


    // 滑鼠點擊的事件 // 點擊的時候判斷在哪一個圖片上
    function handleMouseDown(event: React.MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const mouseX = event.clientX - canvas.offsetLeft;
        const mouseY = event.clientY - canvas.offsetTop;
        // console.log("mouseX : ", mouseX, "mouseY : ", mouseY)
        // 判斷滑鼠是否在圖片上
        if (isMouseOverImage(mouseX, mouseY)) {
            console.log("mouse is on image:" + largetZIndexRef.current);
            isMouseOverRef.current = false;
        }

    }

    const largetZIndexRef = useRef(0);
    const isMouseOverRef = useRef(false);
    function isMouseOverImage(mouseX: number, mouseY: number) {
        const canvas = canvasRef.current;
        if (!canvas) return false;
        const ctx = canvas.getContext("2d");
        if (!ctx) return false;

        // 找出最上層的圖片
        layers.forEach(layer => {
            ctx.save();
            if (layer.type === 'image') {
                const [x, y, width, height] = layer.imageRange;
                const rectPath = new Path2D();

                const newX = x + (width / 2) * (1 - layer.scale);
                const newY = y + (height / 2) * (1 - layer.scale);
                const newWidth = width * layer.scale;
                const newHeight = height * layer.scale;

                // rectPath.rect(x, y, width, height);
                rectPath.rect(newX, newY, newWidth, newHeight);

                if (ctx.isPointInPath(rectPath, mouseX, mouseY)) { // 利用 isPointInPath() 判斷鼠標位置是否在路徑內
                    largetZIndexRef.current = layer.zIndex;
                    isMouseOverRef.current = true;
                }
            }
            else {
                if (ctx.isPointInPath(layer.path, mouseX, mouseY)) { // 利用 isPointInPath() 判斷鼠標位置是否在路徑內
                    largetZIndexRef.current = layer.zIndex;
                    isMouseOverRef.current = true;
                }
            }
            ctx.restore();
        });

        return isMouseOverRef.current;
    }


    // 這邊是控制拖移照片進入到畫布的部分
    function handleDragOver(event: React.DragEvent<HTMLCanvasElement>) {
        event.preventDefault();
    }

    function handleDrop(event: React.DragEvent<HTMLCanvasElement>) {
        event.preventDefault();
        if (!image) return;

        // 圖片的位置 = 滑鼠在瀏覽器的位置 - canvas的位置 - 一開始抓取的滑鼠在圖片的位置
        const x = event.clientX - canvasRef.current!.offsetLeft - startCoords.x;
        const y = event.clientY - canvasRef.current!.offsetTop - startCoords.y;
        const width = image.width;
        const height = image.height;

        const imageLayer: ImageLayer = {
            type: 'image',
            scale: 1,
            imageRange: [x, y, width, height],
            image: image,
            zIndex: layers.length + 1,
        }
        const newLayers = [...layers, imageLayer];
        setLayers(newLayers);
        const newHistory = layerHistory.slice(0, currentStep + 1);
        newHistory.push(newLayers);
        setLayerHistory(newHistory);
        setCurrentStep(currentStep + 1);
    }

    function handleDragStart(event: React.DragEvent<HTMLImageElement>) {
        const startX = event.clientX - event.currentTarget.offsetLeft;
        const startY = event.clientY - event.currentTarget.offsetTop;
        setStartCoords({ x: startX, y: startY });
        setImage(event.currentTarget);
    }

    function handleDragEnd(event: React.DragEvent<HTMLImageElement>) {
    }


    /// 這邊是控制圖層的部分
    const handleUndo = () => {
        if (currentStep <= 0) return;

        setCurrentStep((prev) => (prev - 1));
        setLayers(layerHistory[currentStep - 1]);
    }


    const handleRedo = () => {
        if (currentStep >= layerHistory.length - 1) return;
        setCurrentStep((prev) => (prev + 1));
        setLayers(layerHistory[currentStep + 1]);
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
    }

    return (
        <Layout>
            <Head>
                <title>圖層</title>
            </Head>
            <div className="control">
                <button onClick={handleUndo}>上一步</button>
                <button onClick={handleRedo}>下一步</button>
                <button onClick={handleClear}>清除</button>
            </div>
            <div className="flex">
                <canvas ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
                <div>
                    <div>
                        <Image src="/images/profile.jpg" width={20} height={20} alt=""
                            draggable
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        />
                    </div>
                    <div>
                        <Image src="/images/profile.jpg" width={20} height={20} alt=""
                            draggable
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        />
                    </div>
                </div>
            </div>
        </Layout>
    )
}

export default HomePage