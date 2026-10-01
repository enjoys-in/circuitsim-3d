import { useCallback, useRef, useState } from "react";
import type { Board, Point } from "../model/pcbTypes";

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_W = 80;
const MAX_W = 4000;
const PAD = 40;

export interface PanZoom {
  svgRef: React.RefObject<SVGSVGElement>;
  viewBox: ViewBox;
  viewBoxString: string;
  zoomPercent: number;
  toBoard: (clientX: number, clientY: number) => Point;
  zoomAt: (clientX: number, clientY: number, factor: number) => void;
  zoomByCenter: (factor: number) => void;
  setZoomPercent: (percent: number) => void;
  panBy: (dxClient: number, dyClient: number) => void;
  fit: (board: Board) => void;
}

export function usePanZoom(initial: Board): PanZoom {
  const svgRef = useRef<SVGSVGElement>(null);
  const fitWidth = useRef(initial.width + PAD * 2);
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: -PAD,
    y: -PAD,
    w: initial.width + PAD * 2,
    h: initial.height + PAD * 2,
  });

  const scale = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect && rect.width ? viewBox.w / rect.width : 1;
  }, [viewBox.w]);

  const toBoard = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w,
        y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h,
      };
    },
    [viewBox],
  );

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      setViewBox((vb) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return vb;
        const nextW = Math.max(MIN_W, Math.min(MAX_W, vb.w * factor));
        const nextH = (nextW / vb.w) * vb.h;
        const px = (clientX - rect.left) / rect.width;
        const py = (clientY - rect.top) / rect.height;
        return {
          w: nextW,
          h: nextH,
          x: vb.x + (vb.w - nextW) * px,
          y: vb.y + (vb.h - nextH) * py,
        };
      });
    },
    [],
  );

  const panBy = useCallback(
    (dxClient: number, dyClient: number) => {
      const s = scale();
      setViewBox((vb) => ({ ...vb, x: vb.x - dxClient * s, y: vb.y - dyClient * s }));
    },
    [scale],
  );

  const zoomByCenter = useCallback((factor: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  }, [zoomAt]);

  const setZoomPercent = useCallback((percent: number) => {
    const clamped = Math.min(400, Math.max(20, percent));
    setViewBox((vb) => {
      const nextW = Math.max(MIN_W, Math.min(MAX_W, fitWidth.current / (clamped / 100)));
      const nextH = (nextW / vb.w) * vb.h;
      return { w: nextW, h: nextH, x: vb.x + (vb.w - nextW) / 2, y: vb.y + (vb.h - nextH) / 2 };
    });
  }, []);

  const fit = useCallback((board: Board) => {
    fitWidth.current = board.width + PAD * 2;
    setViewBox({ x: -PAD, y: -PAD, w: board.width + PAD * 2, h: board.height + PAD * 2 });
  }, []);

  return {
    svgRef,
    viewBox,
    viewBoxString: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`,
    zoomPercent: Math.round((fitWidth.current / viewBox.w) * 100),
    toBoard,
    zoomAt,
    zoomByCenter,
    setZoomPercent,
    panBy,
    fit,
  };
}
