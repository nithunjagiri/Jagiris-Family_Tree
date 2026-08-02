import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Tree from 'react-d3-tree';
import { User, UserPlus, ZoomIn, ZoomOut, Maximize2, Expand, Shrink } from 'lucide-react';
import { familyTreeApi } from '../services/api';
import { formatCalendarLong } from '../lib/calendarDate';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import ModulePageHeader from '../components/ModulePageHeader';
import { isCompactViewport } from '../lib/mobile';

const NODE_WIDTH = 140;
/** SVG foreignObject box — tight; overflow visible so extra text is not clipped. */
const FOREIGN_OBJECT_HEIGHT = 118;
const SPOUSE_GAP = 14;
const NODE_SIZE_X = NODE_WIDTH * 2 + SPOUSE_GAP + 60;
/** Vertical spacing between tree levels (keep a bit below node height for edge lines). */
const NODE_SIZE_Y = FOREIGN_OBJECT_HEIGHT + 44;

const SCALE_EXTENT = { min: 0.15, max: 2.5 };
const ZOOM_FACTOR = 1.35;
/** Minimum zoom so nodes stay readable when the tree is very wide. */
const MIN_READABLE_ZOOM = 0.38;
const MIN_READABLE_ZOOM_MOBILE = 0.48;

const cardButtonClass =
  'flex min-h-0 flex-col items-center rounded-xl border border-gray-200/90 bg-white px-2 py-1.5 shadow-sm transition-all duration-200 hover:border-primary-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800/95 dark:hover:border-primary-500 dark:focus-visible:ring-offset-gray-950 cursor-pointer overflow-visible';

function getTreeDepth(node) {
  if (!node.children || node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(getTreeDepth));
}

function getTreeWidth(node) {
  const queue = [node];
  let maxWidth = 1;
  while (queue.length > 0) {
    const levelSize = queue.length;
    maxWidth = Math.max(maxWidth, levelSize);
    for (let i = 0; i < levelSize; i++) {
      const n = queue.shift();
      if (n.children) n.children.forEach((c) => queue.push(c));
    }
  }
  return maxWidth;
}

function estimateInitialZoom(containerWidth, containerHeight, treeData, { mobile = false } = {}) {
  if (!treeData || containerWidth <= 0 || containerHeight <= 0) {
    return mobile ? MIN_READABLE_ZOOM_MOBILE : MIN_READABLE_ZOOM;
  }
  const depth = getTreeDepth(treeData);
  const width = getTreeWidth(treeData);
  const estimatedW = width * NODE_SIZE_X * 1.25;
  const estimatedH = depth * NODE_SIZE_Y * 1.35;
  const zoomW = containerWidth / estimatedW;
  const zoomH = containerHeight / estimatedH;
  const minZoom = mobile ? MIN_READABLE_ZOOM_MOBILE : MIN_READABLE_ZOOM;

  // Wide trees: fit by height and allow horizontal pan instead of shrinking to invisible size.
  if (mobile || zoomW < minZoom) {
    const zoom = Math.min(zoomH * 1.06, SCALE_EXTENT.max);
    return Math.max(zoom, minZoom);
  }

  const zoom = Math.min(zoomW, zoomH, SCALE_EXTENT.max);
  return Math.max(zoom, minZoom);
}

/** Vertical translate so the fitted tree sits nearer the middle of the viewport (root is at translate). */
function computeFitTranslate(containerWidth, containerHeight, treeData, zoom) {
  if (!treeData || containerWidth <= 0 || containerHeight <= 0) {
    return { x: containerWidth / 2 || 0, y: 56 };
  }
  const depth = getTreeDepth(treeData);
  const approxTreePxH = depth * NODE_SIZE_Y * zoom * 0.9;
  const margin = 36;
  const y = Math.max(margin, Math.min((containerHeight - approxTreePxH) / 2 + margin * 0.35, containerHeight * 0.42));
  return { x: containerWidth / 2, y };
}

/** Avoid setState when react-d3-tree reports the same view — prevents infinite update depth. */
function viewNearlyEqual(a, b) {
  if (!a || !b) return false;
  return (
    Math.abs(a.zoom - b.zoom) < 1e-4 &&
    Math.abs(a.translate.x - b.translate.x) < 0.5 &&
    Math.abs(a.translate.y - b.translate.y) < 0.5
  );
}

function CustomNode({ nodeDatum, onNodeClick, onSpouseClick }) {
  const d = nodeDatum?.data ?? nodeDatum ?? {};
  const id = d.id ?? d.attributes?.id ?? nodeDatum?.id ?? nodeDatum?.attributes?.id;
  const name = d.name ?? d.attributes?.name ?? nodeDatum?.name ?? 'Unknown';
  const photo = d.profile_photo ?? d.attributes?.profile_photo;
  const dob = d.date_of_birth ?? d.attributes?.date_of_birth;
  const spouse = d.spouse ?? d.attributes?.spouse;
  const parentNames = d.parent_names ?? d.attributes?.parent_names;
  const hasSpouse = spouse && (spouse.name ?? spouse.attributes?.name);

  const boxWidth = hasSpouse ? NODE_WIDTH * 2 + SPOUSE_GAP : NODE_WIDTH;
  const boxHeight = FOREIGN_OBJECT_HEIGHT;

  const displayName = typeof name === 'string' ? name : (name?.name ?? 'Unknown');
  const spouseName = spouse && (typeof spouse.name === 'string' ? spouse.name : spouse.name?.name ?? '');

  return (
    <g>
      <foreignObject width={boxWidth} height={boxHeight} x={-boxWidth / 2} y={-boxHeight / 2} style={{ overflow: 'visible' }}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          className="flex items-start justify-center gap-1"
          style={{
            width: boxWidth,
            height: 'auto',
            minHeight: 0,
            boxSizing: 'border-box',
            overflow: 'visible',
          }}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onNodeClick?.(id); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNodeClick?.(id); } }}
            className={cardButtonClass}
            style={{ width: NODE_WIDTH }}
          >
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-100/80 dark:bg-gray-700 dark:ring-gray-600">
              {photo ? (
                <img src={resolveBackendPublicUrl(photo)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
            <p
              className="mt-0.5 line-clamp-2 w-full max-w-[128px] break-words text-center text-[11px] font-semibold leading-snug text-gray-900 dark:text-white"
              title={displayName}
            >
              {displayName}
            </p>
            {parentNames && (
              <p
                className="mt-0.5 line-clamp-2 w-full max-w-[128px] break-words text-center text-[9px] leading-snug text-gray-500 dark:text-gray-400"
                title={`Parents: ${parentNames}`}
              >
                {parentNames}
              </p>
            )}
            {dob && (
              <p className="mt-0.5 shrink-0 text-[10px] tabular-nums leading-tight text-gray-500 dark:text-gray-500">
                {formatCalendarLong(dob)}
              </p>
            )}
          </div>
          {hasSpouse && (
            <>
              <div
                className="h-[3px] w-4 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
                title="Spouse"
                aria-hidden
              />
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onSpouseClick?.(spouse.id); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSpouseClick?.(spouse.id); } }}
                className={cardButtonClass}
                style={{ width: NODE_WIDTH }}
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-100/80 dark:bg-gray-700 dark:ring-gray-600">
                  {spouse.profile_photo ? (
                    <img src={resolveBackendPublicUrl(spouse.profile_photo)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <p
                  className="mt-0.5 line-clamp-2 w-full max-w-[128px] break-words text-center text-[11px] font-semibold leading-snug text-gray-900 dark:text-white"
                  title={spouseName}
                >
                  {spouseName}
                </p>
                {spouse.date_of_birth && (
                  <p className="mt-0.5 shrink-0 text-[10px] tabular-nums leading-tight text-gray-500 dark:text-gray-500">
                    {formatCalendarLong(spouse.date_of_birth)}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

const viewToolBtnClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800';

export default function FamilyTree() {
  const navigate = useNavigate();
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const viewRef = useRef({ zoom: 0.8, translate: { x: 0, y: 56 } });
  const [treeView, setTreeView] = useState({ zoom: 0.8, translate: { x: 0, y: 56 } });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    familyTreeApi
      .get()
      .then((r) => {
        setTreeData(r.data?.tree ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const applyView = useCallback((next) => {
    viewRef.current = next;
    setTreeView(next);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !treeData) return undefined;
    const el = containerRef.current;
    const sync = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setDimensions((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      if (w > 0 && h > 0) {
        const mobile = isCompactViewport();
        const z = estimateInitialZoom(w, h, treeData, { mobile });
        const tr = computeFitTranslate(w, h, treeData, z);
        const next = { zoom: z, translate: tr };
        viewRef.current = next;
        setTreeView((prev) => (viewNearlyEqual(prev, next) ? prev : next));
      }
    };
    sync();
    const raf = requestAnimationFrame(sync);
    const ro = new ResizeObserver(() => sync());
    ro.observe(el);
    window.addEventListener('resize', sync);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [treeData, applyView]);

  const handleTreeUpdate = useCallback(({ zoom, translate }) => {
    viewRef.current = { zoom, translate };
  }, []);

  const handleZoomIn = () => {
    const v = viewRef.current;
    const nz = Math.min(v.zoom * ZOOM_FACTOR, SCALE_EXTENT.max);
    applyView({ zoom: nz, translate: v.translate });
  };

  const handleZoomOut = () => {
    const v = viewRef.current;
    const nz = Math.max(v.zoom / ZOOM_FACTOR, SCALE_EXTENT.min);
    applyView({ zoom: nz, translate: v.translate });
  };

  const handleFitView = () => {
    if (!treeData || dimensions.width <= 0 || dimensions.height <= 0) return;
    const mobile = isCompactViewport();
    const z = estimateInitialZoom(dimensions.width, dimensions.height, treeData, { mobile });
    const tr = computeFitTranslate(dimensions.width, dimensions.height, treeData, z);
    applyView({ zoom: z, translate: tr });
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleTreeFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      }
    } catch (_) {
      /* Safari / blocked fullscreen */
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col w-full max-w-none">
      <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900 md:px-4">
        <ModulePageHeader
          label="Family Tree"
          description="Click a card to open profile · Drag to pan · Scroll to zoom · Use toolbar to fit or zoom"
          descriptionClassName="hidden sm:block"
          actions={
            <Link
              to="/family-members/add"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <UserPlus className="h-5 w-5" aria-hidden />
              Add Member
            </Link>
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pb-3 pt-2 md:px-4 md:pb-4">
        {!treeData ? (
          <div className="family-tree-viewport flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>No family tree data. Add members and set Father / Mother in Edit to build the tree.</p>
            <Link
              to="/family-members/add"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <UserPlus className="h-5 w-5" aria-hidden />
              Add Member
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-2 shrink-0 rounded-xl border border-gray-200/80 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                View controls
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <button type="button" onClick={handleFitView} className={viewToolBtnClass} title="Fit tree to view">
                  <Maximize2 className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  Fit
                </button>
                <button type="button" onClick={handleZoomIn} className={viewToolBtnClass} title="Zoom in">
                  <ZoomIn className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  Zoom in
                </button>
                <button type="button" onClick={handleZoomOut} className={viewToolBtnClass} title="Zoom out">
                  <ZoomOut className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  Zoom out
                </button>
                <button
                  type="button"
                  onClick={() => void toggleTreeFullscreen()}
                  className={viewToolBtnClass}
                  title={isFullscreen ? 'Exit full screen' : 'Full screen tree'}
                >
                  {isFullscreen ? (
                    <Shrink className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  ) : (
                    <Expand className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  )}
                  {isFullscreen ? 'Exit' : 'Full screen'}
                </button>
              </div>
            </div>

            <div
              ref={containerRef}
              className="family-tree-viewport min-h-0 flex-1"
            >
              {dimensions.width > 0 && dimensions.height > 0 ? (
                <Tree
                  data={treeData}
                  orientation="vertical"
                  pathFunc="elbow"
                  collapsible={false}
                  translate={treeView.translate}
                  dimensions={dimensions}
                  onUpdate={handleTreeUpdate}
                  onNodeClick={(nodeDatum) => {
                    const id = nodeDatum.id ?? nodeDatum.attributes?.id;
                    if (id) navigate(`/family-members/${id}`);
                  }}
                  renderCustomNodeElement={({ nodeDatum }) => (
                    <CustomNode
                      nodeDatum={nodeDatum}
                      onNodeClick={(id) => navigate(`/family-members/${id}`)}
                      onSpouseClick={(id) => navigate(`/family-members/${id}`)}
                    />
                  )}
                  nodeSize={{ x: NODE_SIZE_X, y: NODE_SIZE_Y }}
                  separation={{ siblings: 1.4, nonSiblings: 1.7 }}
                  zoom={treeView.zoom}
                  scaleExtent={SCALE_EXTENT}
                  transitionDuration={0}
                  depthFactor={NODE_SIZE_Y}
                  hasInteractiveNodes
                />
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
