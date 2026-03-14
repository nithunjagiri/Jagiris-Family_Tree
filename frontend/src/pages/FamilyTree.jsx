import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Tree from 'react-d3-tree';
import { User } from 'lucide-react';
import { familyTreeApi } from '../services/api';

const NODE_WIDTH = 120;
const NODE_HEIGHT = 88;
const SPOUSE_GAP = 12;
const NODE_SIZE_X = NODE_WIDTH * 2 + SPOUSE_GAP + 50;
const NODE_SIZE_Y = NODE_HEIGHT + 50;

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

function estimateInitialZoom(containerWidth, containerHeight, treeData) {
  if (!treeData || containerWidth <= 0 || containerHeight <= 0) return 0.8;
  const depth = getTreeDepth(treeData);
  const width = getTreeWidth(treeData);
  const estimatedW = width * NODE_SIZE_X * 1.3;
  const estimatedH = depth * NODE_SIZE_Y * 1.4;
  const zoom = Math.min(
    containerWidth / estimatedW,
    containerHeight / estimatedH,
    2
  );
  return Math.max(Math.min(zoom, 2), 0.2);
}

function CustomNode({ nodeDatum, onNodeClick, onSpouseClick }) {
  const d = nodeDatum;
  const id = d.id ?? d.attributes?.id;
  const name = d.name || 'Unknown';
  const photo = d.profile_photo ?? d.attributes?.profile_photo;
  const dob = d.date_of_birth ?? d.attributes?.date_of_birth;
  const spouse = d.spouse ?? d.attributes?.spouse;
  const hasSpouse = spouse && spouse.name;

  const boxWidth = hasSpouse ? NODE_WIDTH * 2 + SPOUSE_GAP : NODE_WIDTH;
  const boxHeight = NODE_HEIGHT;

  return (
    <g>
      <foreignObject width={boxWidth} height={boxHeight} x={-boxWidth / 2} y={-boxHeight / 2}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          className="flex items-center justify-center gap-1"
          style={{ width: boxWidth, height: boxHeight, boxSizing: 'border-box' }}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onNodeClick?.(id); }}
            onKeyDown={(e) => { if (e.key === 'Enter') onNodeClick?.(id); }}
            className="flex flex-col items-center rounded-xl border-2 border-primary-200 bg-white p-1.5 shadow-md transition-all hover:border-primary-400 hover:shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary-500 cursor-pointer"
            style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              {photo ? (
                <img src={photo} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
            <p className="mt-0.5 truncate text-center text-xs font-semibold text-gray-900 dark:text-white" style={{ maxWidth: NODE_WIDTH - 12 }} title={name}>
              {name}
            </p>
            {dob && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {new Date(dob).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          {hasSpouse && (
            <>
              <div className="h-0.5 w-2 shrink-0 rounded bg-primary-300 dark:bg-primary-600" title="Spouse" />
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onSpouseClick?.(spouse.id); }}
                onKeyDown={(e) => { if (e.key === 'Enter') onSpouseClick?.(spouse.id); }}
                className="flex flex-col items-center rounded-xl border-2 border-primary-100 bg-white p-1.5 shadow cursor-pointer hover:border-primary-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary-500"
                style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  {spouse.profile_photo ? (
                    <img src={spouse.profile_photo} alt={spouse.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <p className="mt-0.5 truncate text-center text-xs font-semibold text-gray-900 dark:text-white" style={{ maxWidth: NODE_WIDTH - 12 }} title={spouse.name}>
                  {spouse.name}
                </p>
                {spouse.date_of_birth && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {new Date(spouse.date_of_birth).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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

export default function FamilyTree() {
  const navigate = useNavigate();
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [initialZoom, setInitialZoom] = useState(0.8);

  useEffect(() => {
    familyTreeApi
      .get()
      .then((r) => {
        const tree = r.data?.tree ?? null;
        setTreeData(tree);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const onResize = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setDimensions({ width: w, height: h });
      setTranslate({ x: w / 2, y: 50 });
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [treeData]);

  useEffect(() => {
    if (treeData && dimensions.width > 0 && dimensions.height > 0) {
      setInitialZoom(estimateInitialZoom(dimensions.width, dimensions.height, treeData));
    }
  }, [treeData, dimensions.width, dimensions.height]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] w-full max-w-none flex-col gap-3">
      <div className="flex flex-shrink-0 items-center justify-between px-4 md:px-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Family Tree</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Click a node to view profile. Drag to pan, scroll to zoom.
        </p>
      </div>

      <div
        ref={containerRef}
        className="w-full max-w-none flex-1 min-h-[500px] rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
        style={{ width: '100%' }}
      >
        {!treeData ? (
          <div className="flex h-full min-h-[500px] items-center justify-center text-gray-500 dark:text-gray-400">
            No family tree data. Add members with father_id or mother_id set to build the tree.
          </div>
        ) : dimensions.width > 0 ? (
          <Tree
            data={treeData}
            orientation="vertical"
            pathFunc="elbow"
            collapsible={false}
            translate={translate}
            dimensions={dimensions}
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
            separation={{ siblings: 1.2, nonSiblings: 1.4 }}
            zoom={initialZoom}
            scaleExtent={{ min: 0.2, max: 2 }}
            enableLegacyTransitions
            styles={{
              links: {
                stroke: 'rgb(147, 197, 253)',
                strokeWidth: 2,
              },
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
