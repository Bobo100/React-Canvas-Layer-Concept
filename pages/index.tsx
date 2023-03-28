import Head from "next/head";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
    const [image2, setImage2] = useState<HTMLImageElement>();
    const [startCoords, setStartCoords] = useState({ x: 0, y: 0 });

    const [layers, setLayers] = useState<Layer[]>([]);

    // layer history用來記錄每一個步驟的layers
    const [layerHistory, setLayerHistory] = useState<Layer[][]>([[]]);
    const [currentStep, setCurrentStep] = useState<number>(0);

    useEffect(() => {
        draw();
        console.log(layerHistory)
    }, [layers]);




    function draw() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (layers.length === 0) return;
        layers.forEach(layer => {
            if (layer.type === 'image') {
                const [x, y, width, height] = layer.imageRange;
                ctx.drawImage(layer.image, x, y, width, height);
            } else {
                ctx.fillStyle = layer.fillColor;
                ctx.strokeStyle = layer.strokeColor;
                ctx.lineWidth = layer.stokeWidth;
                ctx.fill(layer.path);
                ctx.stroke(layer.path);
            }
        });
    }

    function handleDragOver(event: React.DragEvent<HTMLCanvasElement>) {
        event.preventDefault();
    }

    function handleDrop(event: React.DragEvent<HTMLCanvasElement>) {
        event.preventDefault();
        if (!image2) return;

        // 圖片的位置 = 滑鼠在瀏覽器的位置 - canvas的位置 - 一開始抓取的滑鼠在圖片的位置
        const x = event.clientX - canvasRef.current!.offsetLeft - startCoords.x;
        const y = event.clientY - canvasRef.current!.offsetTop - startCoords.y;
        const width = image2.width;
        const height = image2.height;

        const imageLayer: ImageLayer = {
            type: 'image',
            scale: 1,
            imageRange: [x, y, width, height],
            image: image2,
            zIndex: 0,
        }
        const newLayers = [...layers, imageLayer];
        setLayers(newLayers);
        const newHistory = layerHistory.slice(0, currentStep + 1);
        newHistory.push(newLayers);
        setLayerHistory(newHistory);
        setCurrentStep(currentStep + 1);
    }

    //
    function handleDragStart(event: React.DragEvent<HTMLImageElement>) {
        const startX = event.clientX - event.currentTarget.offsetLeft;
        const startY = event.clientY - event.currentTarget.offsetTop;
        // setIsDraggable(true);
        setStartCoords({ x: startX, y: startY });
        setImage2(event.currentTarget);
    }

    function handleDragEnd(event: React.DragEvent<HTMLImageElement>) {
        // setIsDraggable(false);
    }


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