import Head from "next/head";
import Image from "next/image";
import { useRef } from "react";
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

    return (
        <Layout>
            <Head>
                <title>圖層</title>
            </Head>
            <div className="flex">
                <canvas ref={canvasRef} />
                <div>
                    <div>
                        <Image src="/images/profile.jpg" width={20} height={20} alt="" />
                    </div>
                    <div>
                        <Image src="/images/profile.jpg" width={20} height={20} alt="" />
                    </div>
                </div>
            </div>
        </Layout>
    )
}

export default HomePage